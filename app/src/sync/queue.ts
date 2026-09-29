import type { ServerVisit } from '@/api/types';
import { readJson, writeJson, StorageKeys } from '@/storage/kv';
import {
  isDue,
  newLocalVisit,
  nextAttemptDelayMs,
  sortVisits,
  toSyncedVisit,
  type LocalVisit,
  type NewLocalVisit,
  type VisitFailure,
} from './types';

/**
 * The on-device visit store.
 *
 * AsyncStorage has no transactions and no compare-and-swap, so every mutation
 * goes through one serialised chain: read the in-memory copy, apply the change,
 * persist the whole list, then notify. Two calls can never interleave and lose
 * a write, and a killed process leaves either the previous list or the new one -
 * never a half-written one.
 */

let cache: LocalVisit[] = [];
let chain: Promise<unknown> = Promise.resolve();
let loaded = false;

type Listener = (visits: LocalVisit[]) => void;
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = sortVisits(cache);
  for (const listener of listeners) listener(snapshot);
}

async function mutate(change: (draft: LocalVisit[]) => LocalVisit[]): Promise<void> {
  const run = chain.then(async () => {
    const next = change([...cache]);
    cache = next;
    await writeJson(StorageKeys.visits, cache);
    emit();
  });
  // The chain itself must never reject, otherwise one failed write would
  // poison every later mutation.
  chain = run.catch(() => {});
  return run;
}

/** Reads the persisted queue once. Safe to call more than once. */
export async function loadQueue(): Promise<LocalVisit[]> {
  if (!loaded) {
    cache = sortVisits(await readJson<LocalVisit[]>(StorageKeys.visits, []));
    loaded = true;
    emit();
  }
  return sortVisits(cache);
}

export function getVisits(): LocalVisit[] {
  return sortVisits(cache);
}

export function getVisit(clientId: string): LocalVisit | undefined {
  return cache.find((visit) => visit.clientId === clientId);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function patch(
  clientId: string,
  change: (visit: LocalVisit) => LocalVisit
): Promise<void> {
  return mutate((draft) =>
    draft.map((visit) => (visit.clientId === clientId ? change(visit) : visit))
  );
}

export function enqueueVisit(input: NewLocalVisit): Promise<void> {
  return mutate((draft) => [newLocalVisit(input), ...draft]);
}

export function markSynced(clientId: string, server: ServerVisit): Promise<void> {
  return patch(clientId, (visit) => toSyncedVisit(visit, server));
}

export function markFailed(clientId: string, failure: VisitFailure): Promise<void> {
  return patch(clientId, (visit) => ({
    ...visit,
    status: 'failed',
    failure,
    nextAttemptAt: null,
  }));
}

/** A transient failure: stays Pending and waits out a backoff. */
export function markRetryLater(clientId: string): Promise<void> {
  return patch(clientId, (visit) => {
    const attempts = visit.attempts + 1;
    return {
      ...visit,
      status: 'pending',
      attempts,
      nextAttemptAt: Date.now() + nextAttemptDelayMs(attempts),
    };
  });
}

/** Clears the backoff so a "Retry now" tap goes out immediately. */
export function resetBackoff(): Promise<void> {
  return mutate((draft) =>
    draft.map((visit) => (visit.status === 'pending' ? { ...visit, nextAttemptAt: null } : visit))
  );
}

/**
 * Folds the server's view into the device list.
 *
 * Visits the app knows about are updated in place - a local Pending row whose
 * clientId turns up on the server becomes Synced, which is how a visit survives
 * being killed mid-sync and still ends up shown once. Server rows the device
 * has never seen (submitted from another device, or from curl) are inserted.
 */
export function mergeServerVisits(serverVisits: ServerVisit[]): Promise<void> {
  return mutate((draft) => {
    const byClientId = new Map(draft.map((visit) => [visit.clientId, visit]));
    const next = [...draft];

    for (const server of serverVisits) {
      const existing = byClientId.get(server.clientId);
      if (existing) {
        const index = next.findIndex((visit) => visit.clientId === server.clientId);
        next[index] = toSyncedVisit(existing, server);
      } else {
        next.push({
          clientId: server.clientId,
          userId: server.userId,
          udiseCode: server.udiseCode,
          schoolName: server.schoolName,
          visitedAt: server.visitedAt,
          answers: server.answers ?? [],
          status: 'synced',
          failure: null,
          attempts: 0,
          nextAttemptAt: null,
          queuedAt: server.createdAt ?? new Date().toISOString(),
          syncedAt: null,
          serverUpdatedAt: server.updatedAt ?? null,
        });
      }
    }

    return next;
  });
}

export function pendingFor(userId: string): LocalVisit[] {
  const now = Date.now();
  return cache.filter(
    (visit) => visit.userId === userId && visit.status === 'pending' && isDue(visit, now)
  );
}

export function hasDuePending(userId: string): boolean {
  return pendingFor(userId).length > 0;
}

/** Removes a Failed visit from the device after the user dismisses it. */
export function discardVisit(clientId: string): Promise<void> {
  return mutate((draft) => draft.filter((visit) => visit.clientId !== clientId));
}
