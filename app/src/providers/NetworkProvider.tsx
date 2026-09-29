import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

type NetworkState = {
  /** NetInfo's view: is there a usable network interface (Wi-Fi, cellular, ethernet). */
  isConnected: boolean;
  /** True when connected to a network. */
  isOnline: boolean;
  connectionType: string;
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
      // If the device has an active network connection (Wi-Fi, Cellular, Ethernet),
      // consider it online. Local LAN backends don't require external internet reachability.
      const connected = Boolean(info.isConnected);
      setState({
        isConnected: connected,
        isOnline: connected,
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
