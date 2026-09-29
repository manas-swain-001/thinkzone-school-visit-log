import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getApiBaseUrl } from '@/config/apiConfig';

type NetworkState = {
  /** NetInfo's own view: is there a usable network interface. */
  isConnected: boolean;
  /** isConnected && the internet/API is actually reachable. */
  isOnline: boolean;
  connectionType: string;
  /** True while NetInfo is still working out the first reading. */
  isChecking: boolean;
  /** Manually trigger a fresh check against the server and network */
  checkConnectivity: () => Promise<boolean>;
};

const NetworkContext = createContext<NetworkState | null>(null);

const INITIAL: NetworkState = {
  isConnected: true,
  isOnline: true,
  connectionType: 'unknown',
  isChecking: true,
  checkConnectivity: async () => true,
};

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>(INITIAL);

  const testServer = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) return false;
      const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let active = true;

    const apply = async (info: NetInfoState) => {
      if (!active) return;
      const isConnected = Boolean(info.isConnected);

      // If NetInfo explicitly confirms public internet, we're online.
      // If NetInfo says internet is NOT reachable (common on private LAN / Wi-Fi),
      // we directly probe the backend server at /api/health before declaring offline!
      let online = isConnected && info.isInternetReachable === true;
      if (isConnected && !online) {
        const serverUp = await testServer();
        if (serverUp) online = true;
      }

      if (active) {
        setState((prev) => ({
          ...prev,
          isConnected,
          isOnline: online,
          connectionType: info.type,
          isChecking: false,
        }));
      }
    };

    const unsubscribe = NetInfo.addEventListener((info) => void apply(info));
    NetInfo.fetch().then((info) => void apply(info)).catch(() => {});

    // Periodic heartbeat every 8 seconds if not currently online
    // to detect immediately when server or Wi-Fi becomes reachable
    const heartbeat = setInterval(async () => {
      const serverUp = await testServer();
      if (active && serverUp) {
        setState((prev) => (prev.isOnline ? prev : { ...prev, isConnected: true, isOnline: true, isChecking: false }));
      }
    }, 8000);

    return () => {
      active = false;
      unsubscribe();
      clearInterval(heartbeat);
    };
  }, []);

  const checkConnectivity = async (): Promise<boolean> => {
    const info = await NetInfo.fetch();
    const isConnected = Boolean(info.isConnected);
    let online = isConnected && info.isInternetReachable === true;
    if (isConnected && !online) {
      const serverUp = await testServer();
      if (serverUp) online = true;
    }
    setState((prev) => ({
      ...prev,
      isConnected,
      isOnline: online,
      connectionType: info.type,
      isChecking: false,
    }));
    return online;
  };

  const value = useMemo(() => ({ ...state, checkConnectivity }), [state]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkState {
  const value = use(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside <NetworkProvider>');
  return value;
}
