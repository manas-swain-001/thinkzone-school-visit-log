import type { ErrorDetail } from '@/api/errors';
import type { Answer, ServerVisit } from '@/api/types';

export type VisitStatus = 'pending' | 'synced' | 'failed';

/** Why a visit is Failed. Only ever set for a permanent 4xx rejection. */
export type VisitFailure = {
  code: string;
  message: string;
  details: ErrorDetail[];
  at: string;
};

/**
 * A visit as it exists on the device.
 *
 * This one record is the app's source of truth for the visit list: it holds
 * both the visits still queued and, once a visit has been accepted by the
 * server, what the server stored. Keeping them together means "My visits"
 * renders identically online and offline, and a replayed sync can update the
 * row in place instead of appending a duplicate.
 */
export type LocalVisit = {
  clientId: string;
  userId: string;
  udiseCode: string;
  schoolName: string;
  visitedAt: string;
  answers: Answer[];

  status: VisitStatus;
  failure: VisitFailure | null;

  attempts: number;
  nextAttemptAt: number | null;

  queuedAt: string;
  syncedAt: string | null;
  serverUpdatedAt: string | null;
};

export type NewLocalVisit = Pick<
  LocalVisit,
  'clientId' | 'userId' | 'udiseCode' | 'schoolName' | 'visitedAt' | 'answers'
>;

export function newLocalVisit(input: NewLocalVisit): LocalVisit {
  return {
    ...input,
    status: 'pending',
    failure: null,
    attempts: 0,
    nextAttemptAt: null,
    queuedAt: new Date().toISOString(),
    syncedAt: null,
    serverUpdatedAt: null,
  };
}

export function isDue(visit: LocalVisit, now: number = Date.now()): boolean {
  return visit.nextAttemptAt === null || visit.nextAttemptAt <= now;
}

/** Newest first, which is the order the server lists them in too. */
export function sortVisits(visits: LocalVisit[]): LocalVisit[] {
  return [...visits].sort((a, b) => {
    const byVisitedAt = b.visitedAt.localeCompare(a.visitedAt);
    return byVisitedAt !== 0 ? byVisitedAt : b.queuedAt.localeCompare(a.queuedAt);
  });
}

/**
 * Backoff for a visit the server would not take yet.
 *
 * Deliberately simple: 5s, 10s, 20s ... capped at 5 minutes. The queue is
 * normally a handful of visits, and the brief only asks for "retry later" - a
 * jittered exponential schedule would add machinery nobody can explain in the
 * demo.
 */
export function nextAttemptDelayMs(attempts: number): number {
  const capped = Math.min(attempts, 7);
  return Math.min(5_000 * 2 ** capped, 300_000);
}

export function toSyncedVisit(local: LocalVisit, server: ServerVisit): LocalVisit {
  return {
    ...local,
    status: 'synced',
    failure: null,
    nextAttemptAt: null,
    schoolName: server.schoolName ?? local.schoolName,
    serverUpdatedAt: server.updatedAt ?? null,
    syncedAt: local.syncedAt ?? new Date().toISOString(),
  };
}

export function countByStatus(visits: LocalVisit[]): Record<VisitStatus, number> {
  const counts: Record<VisitStatus, number> = { pending: 0, synced: 0, failed: 0 };
  for (const visit of visits) counts[visit.status] += 1;
  return counts;
}
