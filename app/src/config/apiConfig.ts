import { readJson, writeJson, StorageKeys } from '@/storage/kv';

/**
 * The API host.
 *
 * The bundled default comes from EXPO_PUBLIC_API_BASE_URL (.env) so that
 * swapping machines is a one-line change, but it is only a *default*: the
 * Settings screen writes an override to the device, which is what makes the
 * same build usable when the laptop moves to a different Wi-Fi.
 *
 * 127.0.0.1 is wrong on a real phone - from the phone it means the phone.
 */
const BUNDLED_DEFAULT = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';

let current = normalise(BUNDLED_DEFAULT) || 'http://192.168.1.131:3000';
let loaded = false;

export function getApiBaseUrl(): string {
  return current;
}

/** Adds a scheme if missing and drops trailing slashes, so paths join cleanly. */
export function normaliseBaseUrl(raw: string): string {
  return normalise(raw);
}

function normalise(raw: string): string {
  let value = raw.trim();
  if (value === '') return '';
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  return value.replace(/\/+$/, '');
}

/** Called once at startup; a stored override wins over the bundled default. */
export async function hydrateApiBaseUrl(): Promise<void> {
  const stored = await readJson<string | null>(StorageKeys.apiBaseUrl, null);
  if (typeof stored === 'string') {
    const value = normalise(stored);
    if (value) current = value;
  }
  loaded = true;
}

export async function saveApiBaseUrl(raw: string): Promise<string> {
  const value = normalise(raw);
  if (!value) return current;
  current = value;
  await writeJson(StorageKeys.apiBaseUrl, value);
  return value;
}

export function isOverridden(): boolean {
  return normalise(BUNDLED_DEFAULT) !== current;
}

export function isHydrated(): boolean {
  return loaded;
}

/** True when the host looks like a loopback address, i.e. wrong on a phone. */
export function isLoopbackHost(raw: string): boolean {
  try {
    const { hostname } = new URL(normalise(raw));
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
