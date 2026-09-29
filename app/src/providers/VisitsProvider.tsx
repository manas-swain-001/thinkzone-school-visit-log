import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useApp } from './AppProvider';
import { useNetwork } from './NetworkProvider';
import {
  discardVisit,
  enqueueVisit,
  getVisits,
  hasDuePending,
  loadQueue,
  resetBackoff,
  subscribe,
} from '@/sync/queue';
import { syncNow as runSync, type SyncResult } from '@/sync/syncEngine';
import { countByStatus, type LocalVisit, type NewLocalVisit, type VisitStatus } from '@/sync/types';

const RETRY_TICK_MS = 30_000;

type VisitsContextValue = {
  ready: boolean;
  visits: LocalVisit[];
  /** Visits belonging to the signed-in user, newest first. */
  myVisits: LocalVisit[];
  counts: Record<VisitStatus, number>;
  isSyncing: boolean;
  lastResult: SyncResult | null;
  enqueue: (input: NewLocalVisit) => Promise<void>;
  sync: (options?: { pull?: boolean; force?: boolean }) => Promise<SyncResult>;
  retryFailed: () => Promise<void>;
  discard: (clientId: string) => Promise<void>;
};

const VisitsContext = createContext<VisitsContextValue | null>(null);

export function VisitsProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const { isOnline } = useNetwork();

  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [ready, setReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  // Guards the launch sync: `user` is resolved asynchronously, so without this
  // the effect would fire again on every render before the choice is restored.
  const launchedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadQueue().then((loaded) => {
      if (cancelled) return;
      setVisits(loaded);
      setReady(true);
    });
    const unsubscribe = subscribe(setVisits);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const sync = useCallback(
    async (options?: { pull?: boolean; force?: boolean }) => {
      if (!user) {
        return emptyResult();
      }
      setIsSyncing(true);
      try {
        if (options?.force) {
          await resetBackoff();
        }
        const result = await runSync({
          userId: user.userId,
          pull: options?.pull ?? true,
          force: options?.force ?? false,
        });
        setLastResult(result);
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  // Trigger 1: app opened (or the user was chosen). Anything left Pending from
  // a previous session goes out now, which is the "reopened" case in the brief.
  useEffect(() => {
    if (!user || !ready || !isOnline) return;
    if (launchedFor.current === user.userId) return;
    launchedFor.current = user.userId;
    void sync({ force: true });
  }, [user, ready, isOnline, sync]);

  // Trigger 2: the network came back. The demo turns airplane mode off without
  // touching the app, so this transition is the only signal there is.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current && user) {
      void sync({ force: true });
    }
    wasOnline.current = isOnline;
  }, [isOnline, user, sync]);

  // Trigger 3: a slow tick for anything that failed with a 5xx or a dropped
  // connection while the network still looked up. Cheap because syncNow()
  // returns immediately when there is nothing due.
  useEffect(() => {
    if (!user || !isOnline || !ready) return;
    const timer = setInterval(() => {
      if (hasDuePending(user.userId)) void sync();
    }, RETRY_TICK_MS);
    return () => clearInterval(timer);
  }, [user, isOnline, ready, sync]);

  const enqueue = useCallback(
    async (input: NewLocalVisit) => {
      // Write to the device first and only then reach for the network. The
      // visit exists on disk before any request is made, so a failure - or a
      // process death - during the send can never lose it.
      await enqueueVisit(input);
      if (isOnline) void sync({ force: true });
    },
    [isOnline, sync]
  );

  const retryFailed = useCallback(async () => {
    await resetBackoff();
    await sync({ force: true });
  }, [sync]);

  const discard = useCallback((clientId: string) => discardVisit(clientId), []);

  const myVisits = useMemo(
    () => (user ? visits.filter((visit) => visit.userId === user.userId) : []),
    [visits, user]
  );

  const counts = useMemo(() => countByStatus(myVisits), [myVisits]);

  const value = useMemo<VisitsContextValue>(
    () => ({
      ready,
      visits,
      myVisits,
      counts,
      isSyncing,
      lastResult,
      enqueue,
      sync,
      retryFailed,
      discard,
    }),
    [ready, visits, myVisits, counts, isSyncing, lastResult, enqueue, sync, retryFailed, discard]
  );

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
}

function emptyResult(): SyncResult {
  return {
    attempted: 0,
    sent: 0,
    alreadyStored: 0,
    failed: 0,
    stillPending: 0,
    mergedFromServer: 0,
    stoppedEarly: false,
  };
}

export function useVisits(): VisitsContextValue {
  const value = use(VisitsContext);
  if (!value) throw new Error('useVisits must be used inside <VisitsProvider>');
  return value;
}

export { getVisits };
