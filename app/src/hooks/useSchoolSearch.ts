import { useCallback, useEffect, useState } from 'react';

import { listSchools, SCHOOL_PAGE_SIZE } from '@/api/endpoints';
import { describeError, isAbortError } from '@/api/errors';
import type { SchoolRow } from '@/api/types';
import { blockName } from '@/data/districts';
import { cacheSchools, filterCachedSchools, readCachedSchools } from '@/lib/schoolCache';
import { useNetwork } from '@/providers/NetworkProvider';

/** Long enough to skip a burst of keystrokes, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 400;

/** How many cached matches the offline path is willing to render. */
const OFFLINE_LIMIT = 200;

type Query = {
  search: string;
  districtCode: string | null;
  blockCode: string | null;
};

export type SchoolFilters = Query;

export type SchoolSearchState = {
  schools: SchoolRow[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  /** True when the rows came from the device rather than the network. */
  isFromCache: boolean;
  total: number;
  loadMore: () => void;
  refresh: () => void;
};

/**
 * Paged, debounced school search.
 *
 * Three things the brief calls out live here:
 *
 *  - "Wait until the user stops typing": the text is debounced before it
 *    becomes a query, so a 10-character school name is one request, not ten.
 *  - "Load more rows as the user scrolls": pages are appended by loadMore()
 *    and the server's own limit caps a page at 20.
 *  - Offline: pages already fetched are kept on the device, so a query that
 *    was searched before still answers with no network. The one case that
 *    cannot work is a school that was never loaded, and `isFromCache` lets the
 *    screen say so instead of showing a bare "no results".
 */
export function useSchoolSearch(filters: SchoolFilters): SchoolSearchState {
  const { isOnline } = useNetwork();

  const { search, districtCode, blockCode } = filters;

  const [deployed, setDeployed] = useState<Query>(() => ({
    search: search.trim(),
    districtCode,
    blockCode,
  }));
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // The debounce is a timer, not a render-time derivation, so it lives in an
  // effect. setState only ever happens inside the callback - never in the
  // effect body - which keeps the render pass pure.
  useEffect(() => {
    const next: Query = { search: search.trim(), districtCode, blockCode };
    const delay = next.search === '' ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => setDeployed(next), delay);
    return () => clearTimeout(timer);
  }, [search, districtCode, blockCode]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setPhase('loading');
      setError(null);

      if (!isOnline) {
        const cached = filterCachedSchools(await readCachedSchools(), {
          search: deployed.search,
          blockName: blockName(deployed.blockCode),
        });
        if (cancelled) return;
        setSchools(cached.slice(0, OFFLINE_LIMIT));
        setTotal(cached.length);
        setIsFromCache(true);
        setPage(1);
        setTotalPages(1);
        setPhase('ready');
        return;
      }

      try {
        const response = await listSchools({ ...deployed, page: 1, limit: SCHOOL_PAGE_SIZE, signal: controller.signal });
        if (cancelled) return;
        setSchools(response.data);
        setPage(response.page);
        setTotalPages(response.totalPages);
        setTotal(response.total);
        setIsFromCache(false);
        void cacheSchools(response.data);
      } catch (caught) {
        if (cancelled || isAbortError(caught)) return;
        setError(describeError(caught).message);
      } finally {
        if (!cancelled) {
          setPhase('ready');
          setIsRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deployed, isOnline, nonce]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !isOnline || phase !== 'ready') return;
    if (page === 0 || page >= totalPages) return;

    const next = page + 1;
    setIsLoadingMore(true);
    try {
      const response = await listSchools({ ...deployed, page: next, limit: SCHOOL_PAGE_SIZE });
      setSchools((previous) => dedupe([...previous, ...response.data]));
      setPage(next);
      setTotal(response.total);
      void cacheSchools(response.data);
    } catch (caught) {
      if (!isAbortError(caught)) setError(describeError(caught).message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [deployed, isLoadingMore, isOnline, page, phase, totalPages]);

  const refresh = useCallback(() => {
    if (!isOnline) {
      setNonce((value) => value + 1);
      return;
    }
    setIsRefreshing(true);
    setNonce((value) => value + 1);
  }, [isOnline]);

  return {
    schools,
    isLoading: phase === 'loading',
    isLoadingMore,
    isRefreshing,
    error,
    hasMore: page > 0 && page < totalPages,
    isFromCache,
    total,
    loadMore: () => void loadMore(),
    refresh,
  };
}

function dedupe(rows: SchoolRow[]): SchoolRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.udiseCode)) return false;
    seen.add(row.udiseCode);
    return true;
  });
}
