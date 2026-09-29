import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'svl.v1.';

export const StorageKeys = {
  apiBaseUrl: `${PREFIX}apiBaseUrl`,
  session: `${PREFIX}session`,
  questionnaire: `${PREFIX}questionnaire`,
  schools: `${PREFIX}schools`,
  visits: `${PREFIX}visits`,
} as const;

/**
 * Every persisted value is a single JSON blob behind one namespaced key.
 *
 * Reads never throw: a corrupt or half-written value falls back to the default
 * so a bad write can never brick the app on launch. Writes are awaited by the
 * callers that must not lose data (the visit queue).
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] unreadable value at ${key}, using fallback`, error);
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
