// The SQLCipher key for the journal database: where it comes from, where it is
// kept, and - the part worth reading before changing anything here - what it is
// deliberately *not* protected with.
//
// Per 0001 (local-only architecture) there is no server copy of anything a user
// writes. That single fact drives every choice below: a key that becomes
// unreadable is not an inconvenience, it is the permanent loss of someone's
// medical journal, with no support path that can recover it.

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/** SQLCipher takes a 256-bit key. */
const KEY_BYTES = 32;

/** Keychain (iOS) / Keystore (Android) entry holding the key. */
const KEYCHAIN_ENTRY = 'journal.database.key';

/**
 * How the key entry is protected.
 *
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY, and specifically *not* `requireAuthentication:
 * true`, which is the option you would reach for first and which we are turning
 * down on purpose.
 *
 * expo-secure-store's own documentation is explicit that an entry written with
 * `requireAuthentication: true` "will become inaccessible if there are changes
 * to the user's biometric settings, such as adding a new fingerprint". On a
 * device holding the only copy of the data, that turns an ordinary bit of phone
 * housekeeping - adding a fingerprint because your other thumb is in a bandage,
 * re-enrolling Face ID after new glasses - into silent, total, unrecoverable
 * loss of the journal. 0007 accepts "lose the phone, lose the journal" as a
 * risk it has told the user about; it does not accept, and nobody has told the
 * user about, "add a fingerprint, lose the journal".
 *
 * So the biometric gate lives one level up instead, in src/lib/auth/unlock.ts,
 * as an explicit authentication prompt at app open. That satisfies what 0007
 * actually asks for - a device-biometric lock with the OS passcode fallback -
 * while leaving the key's survival independent of enrollment state.
 *
 * The tradeoff, stated plainly: the key is protected by the device lock rather
 * than bound to biometric enrollment in the secure element, so an attacker with
 * an unlocked device, or with a rooted/jailbroken one and the patience to read
 * the keystore, can reach it. Against that we are weighing a failure mode that
 * is silent, permanent, and triggered by something users do routinely. For a
 * journal whose worst case is disclosure and whose *other* worst case is total
 * loss, this is the better side of the trade - but it is a product decision as
 * much as a technical one and it deserves a signed-off ADR of its own.
 *
 * THIS_DEVICE_ONLY additionally keeps the key out of iCloud/Google backups, so
 * a restored backup on a new phone cannot decrypt a copied database file. That
 * is the same boundary 0003 draws and what issue #115 asks for.
 */
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Thrown when the keychain is reachable but refuses to hand the key back. */
export class DatabaseKeyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseKeyError';
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns the database key, generating and storing one the first time.
 *
 * The hex string this returns is a raw key, not a passphrase - see
 * `rawKeyPragma` for why that distinction matters at the PRAGMA.
 */
export async function getOrCreateDatabaseKey(): Promise<string> {
  let existing: string | null;
  try {
    existing = await SecureStore.getItemAsync(KEYCHAIN_ENTRY, KEYCHAIN_OPTIONS);
  } catch (cause) {
    // Reading can fail on a locked device or a corrupted keychain entry. It is
    // important that this throws rather than falling through to generating a
    // fresh key: a new key against an existing database means every read fails
    // and, worse, an unguarded "recovery" that recreated the file would destroy
    // data that was merely temporarily unreadable.
    throw new DatabaseKeyError('Could not read the database key from secure storage.', {
      cause,
    });
  }

  if (existing) return existing;

  const key = toHex(await Crypto.getRandomBytesAsync(KEY_BYTES));

  try {
    await SecureStore.setItemAsync(KEYCHAIN_ENTRY, key, KEYCHAIN_OPTIONS);
  } catch (cause) {
    throw new DatabaseKeyError('Could not store the database key in secure storage.', {
      cause,
    });
  }

  return key;
}

/**
 * Removes the key.
 *
 * On its own this is not "delete my data" (issue #116) - it strands the
 * database file rather than erasing it. Deleting the file is the other half and
 * lives in database.ts; call both, file first.
 */
export async function deleteDatabaseKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYCHAIN_ENTRY, KEYCHAIN_OPTIONS);
}

/**
 * Builds the `PRAGMA key` statement for a hex key.
 *
 * SQLCipher reads a plain string as a *passphrase* and runs 256k rounds of
 * PBKDF2 over it at every open. The `x'...'` form instead supplies the 32 raw
 * key bytes directly and skips derivation entirely. Since the key here is
 * already 256 bits of CSPRNG output, derivation would add startup latency and
 * no security, so the raw form is the right one - but it is only correct
 * *because* of where the key comes from. Hand this a user-chosen passphrase and
 * you have thrown away the KDF that made it safe.
 */
export function rawKeyPragma(hexKey: string): string {
  if (!/^[0-9a-f]+$/i.test(hexKey) || hexKey.length !== KEY_BYTES * 2) {
    throw new DatabaseKeyError(
      `Expected ${KEY_BYTES * 2} hex characters for a raw SQLCipher key.`
    );
  }
  return `PRAGMA key = "x'${hexKey}'"`;
}
