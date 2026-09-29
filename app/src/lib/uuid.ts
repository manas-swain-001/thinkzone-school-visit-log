import * as Crypto from 'expo-crypto';

/**
 * A visit's clientId. Generated on the device, stored with the visit, and sent
 * verbatim on every retry - that is the whole idempotency story, since the
 * server holds a unique index on it and replays collapse into one document.
 */
export function newClientId(): string {
  return Crypto.randomUUID();
}
