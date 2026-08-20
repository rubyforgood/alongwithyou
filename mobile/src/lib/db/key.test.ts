import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import {
  DatabaseKeyError,
  deleteDatabaseKey,
  getOrCreateDatabaseKey,
  rawKeyPragma,
} from './key';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
}));

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const getRandomBytesAsync = Crypto.getRandomBytesAsync as jest.Mock;

/** 32 bytes, 0x00..0x1f, i.e. 64 hex characters. */
const BYTES = Uint8Array.from({ length: 32 }, (_, i) => i);
const HEX = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

beforeEach(() => {
  jest.clearAllMocks();
  getRandomBytesAsync.mockResolvedValue(BYTES);
});

describe('getOrCreateDatabaseKey', () => {
  it('generates, stores and returns a key the first time', async () => {
    getItemAsync.mockResolvedValue(null);

    await expect(getOrCreateDatabaseKey()).resolves.toEqual({ key: HEX, created: true });

    expect(getRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(setItemAsync).toHaveBeenCalledWith('journal.database.key', HEX, expect.any(Object));
  });

  it('returns the stored key without generating a new one', async () => {
    getItemAsync.mockResolvedValue(HEX);

    await expect(getOrCreateDatabaseKey()).resolves.toEqual({ key: HEX, created: false });

    expect(getRandomBytesAsync).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('reports whether it minted the key, because null is ambiguous', async () => {
    // SecureStore returns null both for "nothing stored yet" and for "the entry
    // was invalidated". Only database.ts can tell those apart - by finding out
    // whether the key opens the file - so this flag has to reach it.
    getItemAsync.mockResolvedValue(null);
    await expect(getOrCreateDatabaseKey()).resolves.toMatchObject({ created: true });

    getItemAsync.mockResolvedValue(HEX);
    await expect(getOrCreateDatabaseKey()).resolves.toMatchObject({ created: false });
  });

  it('stores the key without requireAuthentication, and device-only', async () => {
    // This is the decision documented at length in key.ts. If someone turns
    // requireAuthentication on, adding a fingerprint silently destroys every
    // journal in the field, so it is worth a test that says so out loud.
    getItemAsync.mockResolvedValue(null);
    await getOrCreateDatabaseKey();

    const [, , options] = setItemAsync.mock.calls[0];
    // Absence, not `!== true`. Anything truthy in that slot binds the entry to
    // biometric enrollment just the same, and this is the one assertion 0015
    // stakes its reputation on.
    expect(options).not.toHaveProperty('requireAuthentication');
    expect(options.keychainAccessible).toBe(SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
  });

  it('throws rather than minting a replacement when the read fails', async () => {
    // The dangerous bug this guards: treating an unreadable keychain as "no key
    // yet" and generating a fresh one, which orphans a database that was only
    // temporarily unreachable.
    getItemAsync.mockRejectedValue(new Error('keychain locked'));

    await expect(getOrCreateDatabaseKey()).rejects.toThrow(DatabaseKeyError);
    expect(getRandomBytesAsync).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('reports a failure to store the new key', async () => {
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockRejectedValue(new Error('keychain full'));

    await expect(getOrCreateDatabaseKey()).rejects.toThrow(/Could not store/);
  });
});

describe('deleteDatabaseKey', () => {
  it('removes the keychain entry', async () => {
    await deleteDatabaseKey();
    expect(deleteItemAsync).toHaveBeenCalledWith('journal.database.key', expect.any(Object));
  });
});

describe('rawKeyPragma', () => {
  it('uses SQLCipher raw-key syntax so no KDF runs over an already-random key', () => {
    expect(rawKeyPragma(HEX)).toBe(`PRAGMA key = "x'${HEX}'"`);
  });

  it('rejects anything that is not exactly 32 bytes of hex', () => {
    expect(() => rawKeyPragma('abc')).toThrow(DatabaseKeyError);
    expect(() => rawKeyPragma('z'.repeat(64))).toThrow(DatabaseKeyError);
    expect(() => rawKeyPragma(HEX + '00')).toThrow(/64 hex characters/);
  });
});
