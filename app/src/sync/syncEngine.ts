import { createVisit, listVisits, MAX_PAGE_SIZE } from '@/api/endpoints';
import { describeError, isAbortError, isRetryableError } from '@/api/errors';
import {
  getVisits,
  markFailed,
  markRetryLater,
  markSynced,
  mergeServerVisits,
  pendingFor,
  resetBackoff,
} from './queue';
import type { LocalVisit } from './types';

export type SyncResult = {
  attempted: number;
  sent: number;
  alreadyStored: number;
  failed: number;
  stillPending: number;
  mergedFromServer: number;
  stoppedEarly: boolean;
  reason?: string;
};

type SyncOptions = { userId: string; pull?: boolean; force?: boolean };

/**
 * Only one sync may be in flight at a time, app-wide.
 *
 * This is the second half of the no-duplicates guarantee. The server already
 * collapses two identical clientIds into one document, but without this lock
 * the app itself would fire the same queued visit twice in parallel, race its
 * own AsyncStorage writes and burn the battery. Every trigger - submit, app
 * launch, network regained, the retry timer, the manual button - funnels
 * through syncNow(), and concurrent callers all await the same promise.
 */
let inFlight: Promise<SyncResult> | null = null;

export function isSyncing(): boolean {
  return inFlight !== null;
}

export function syncNow(options: SyncOptions): Promise<SyncResult> {
  if (inFlight) return inFlight;

  const run = runSync(options)
    .catch((error) => ({
      attempted: 0,
      sent: 0,
      alreadyStored: 0,
      failed: 0,
      stillPending: 0,
      mergedFromServer: 0,
      stoppedEarly: true,
      reason: error instanceof Error ? error.message : String(error),
    }))
    .finally(() => {
      inFlight = null;
    });

  inFlight = run;
  return run;
}

async function runSync({ userId, pull = true, force = false }: SyncOptions): Promise<SyncResult> {
  if (force) {
    await resetBackoff();
  }
  const queued = pendingFor(userId, force);

  const result: SyncResult = {
    attempted: queued.length,
    sent: 0,
    alreadyStored: 0,
    failed: 0,
    stillPending: 0,
    mergedFromServer: 0,
    stoppedEarly: false,
  };

  for (const visit of queued) {
    try {
      const { visit: stored, created } = await createVisit(toRequest(visit));
      await markSynced(visit.clientId, stored);
      if (created) result.sent += 1;
      // 200 means the server already had this clientId - the visit was
      // accepted on an earlier attempt whose reply we never saw. Still a
      // success, and still exactly one document on the server.
      else result.alreadyStored += 1;
    } catch (error) {
      if (isAbortError(error)) continue;

      if (isRetryableError(error)) {
        await markRetryLater(visit.clientId);
        // The network or the server is the problem, not this visit. Trying the
        // rest of the queue would just repeat the same failure.
        result.stillPending += 1;
        result.stoppedEarly = true;
        result.reason = describeError(error).message;
        break;
      }

      const { code, message, details } = describeError(error);
      await markFailed(visit.clientId, { code, message, details, at: new Date().toISOString() });
      result.failed += 1;
    }
  }

  if (pull) {
    const merged = await pullServerVisits(userId);
    result.mergedFromServer = merged;
  }

  return result;
}

/**
 * Folds GET /api/visits into the device list.
 *
 * Best effort: if the pull fails the pushed visits above are still recorded,
 * so a sync is never reported as a failure just because the read-back did not
 * land.
 */
async function pullServerVisits(userId: string): Promise<number> {
  const knownBefore = new Set(getVisits().map((visit) => visit.clientId));
  let page = 1;
  let added = 0;

  try {
    for (;;) {
      const response = await listVisits({ userId, page, limit: MAX_PAGE_SIZE });
      if (response.data.length === 0) break;

      for (const visit of response.data) {
        if (!knownBefore.has(visit.clientId)) added += 1;
      }
      await mergeServerVisits(response.data);

      if (page >= response.totalPages) break;
      page += 1;
    }
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('[sync] could not refresh the visit list from the server', error);
    }
  }

  return added;
}

function toRequest(visit: LocalVisit) {
  return {
    clientId: visit.clientId,
    userId: visit.userId,
    udiseCode: visit.udiseCode,
    visitedAt: visit.visitedAt,
    answers: visit.answers,
  };
}
