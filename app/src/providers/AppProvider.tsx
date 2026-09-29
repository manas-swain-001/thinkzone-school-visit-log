import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getApiBaseUrl,
  hydrateApiBaseUrl,
  isOverridden,
  saveApiBaseUrl,
} from '@/config/apiConfig';
import { DEMO_USERS, findUser, type DemoUser } from '@/data/demoUsers';
import { readJson, writeJson, StorageKeys } from '@/storage/kv';

type AppState = {
  ready: boolean;
  user: DemoUser | null;
  apiBaseUrl: string;
  baseUrlOverridden: boolean;
};

type AppContextValue = AppState & {
  users: DemoUser[];
  chooseUser: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateApiBaseUrl: (raw: string) => Promise<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [apiBaseUrl, setBaseUrl] = useState(getApiBaseUrl());
  const [baseUrlOverridden, setOverridden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedUserId, , hydratedUrl] = await Promise.all([
        readJson<string | null>(StorageKeys.session, null),
        hydrateApiBaseUrl(),
        Promise.resolve(getApiBaseUrl()),
      ]);

      if (cancelled) return;
      setUser(findUser(storedUserId));
      setBaseUrl(hydratedUrl);
      setOverridden(isOverridden());
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const chooseUser = useCallback(async (userId: string) => {
    const chosen = findUser(userId);
    if (!chosen) return;
    setUser(chosen);
    await writeJson(StorageKeys.session, chosen.userId);
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await writeJson(StorageKeys.session, null);
  }, []);

  const updateApiBaseUrl = useCallback(async (raw: string) => {
    const saved = await saveApiBaseUrl(raw);
    setBaseUrl(saved);
    setOverridden(isOverridden());
    return saved;
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      user,
      apiBaseUrl,
      baseUrlOverridden,
      users: DEMO_USERS,
      chooseUser,
      signOut,
      updateApiBaseUrl,
    }),
    [ready, user, apiBaseUrl, baseUrlOverridden, chooseUser, signOut, updateApiBaseUrl]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}
