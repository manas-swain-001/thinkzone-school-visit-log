import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

type NetworkState = {
  /** NetInfo's own view: is there a usable network interface. */
  isConnected: boolean;
  /** isConnected && the internet is actually reachable, so not just captive. */
  isOnline: boolean;
  connectionType: string;
  /** True while NetInfo is still working out the first reading. */
  isChecking: boolean;
};

const NetworkContext = createContext<NetworkState | null>(null);

const INITIAL: NetworkState = {
  isConnected: true,
  isOnline: true,
  connectionType: 'unknown',
  isChecking: true,
};

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>(INITIAL);

  useEffect(() => {
    const apply = (info: NetInfoState) => {
      // isInternetReachable is null while it is still being probed, so it is
      // only allowed to veto a connection, never to veto a "no connection".
      const reachable = info.isInternetReachable;
      setState({
        isConnected: Boolean(info.isConnected),
        isOnline: Boolean(info.isConnected) && reachable !== false,
        connectionType: info.type,
        isChecking: false,
      });
    };

    const unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply).catch(() => {});
    return unsubscribe;
  }, []);

  const value = useMemo(() => state, [state]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkState {
  const value = use(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside <NetworkProvider>');
  return value;
}
