import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  closeJournalDatabase,
  DatabaseUnavailableError,
  destroyJournalDatabase,
  getJournalDatabase,
  SQLCipherUnavailableError,
  UnrecoverableJournalError,
} from './database';
import { deleteDatabaseKey, getOrCreateDatabaseKey } from './key';
import { migrate } from './migrations';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
}));
jest.mock('./key', () => ({
  getOrCreateDatabaseKey: jest.fn(),
  deleteDatabaseKey: jest.fn(),
  rawKeyPragma: (hex: string) => `PRAGMA key = "x'${hex}'"`,
}));
jest.mock('./migrations', () => ({ migrate: jest.fn() }));

const openDatabaseAsync = SQLite.openDatabaseAsync as jest.Mock;
const deleteDatabaseAsync = SQLite.deleteDatabaseAsync as jest.Mock;
const getKey = getOrCreateDatabaseKey as jest.Mock;
const deleteKey = deleteDatabaseKey as jest.Mock;
const migrateMock = migrate as jest.Mock;

const KEY = 'a'.repeat(64);

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

/** What a SQLCipher build answers `PRAGMA cipher_version` with. */
const CIPHER_VERSION = { cipher_version: '4.6.1 community' };

/** Records the statements run against it, in order. */
function fakeDatabase() {
  const statements: string[] = [];
  return {
    statements,
    execAsync: jest.fn(async (sql: string) => {
      statements.push(sql);
    }),
    // Return type widened on purpose: expo-sqlite resolves null for no rows,
    // and tests below re-implement this to do exactly that.
    getFirstAsync: jest.fn(async (sql: string): Promise<Record<string, unknown> | null> => {
      statements.push(sql);
      // Stock SQLite returns no row here; a SQLCipher build returns a version.
      // Defaulting to present keeps every other test about its own subject.
      if (sql.includes('cipher_version')) return CIPHER_VERSION;
      return { 'count(*)': 0 };
    }),
    closeAsync: jest.fn(async () => undefined),
  };
}

/** Stock SQLite: accepts PRAGMA key, ignores it, and has no cipher_version. */
function withoutSQLCipher() {
  db.getFirstAsync.mockImplementation(async (sql: string) => {
    db.statements.push(sql);
    if (sql.includes('cipher_version')) return null;
    return { 'count(*)': 0 };
  });
}

let db: ReturnType<typeof fakeDatabase>;

beforeEach(async () => {
  jest.clearAllMocks();
  setPlatform('ios');
  db = fakeDatabase();
  openDatabaseAsync.mockResolvedValue(db);
  getKey.mockResolvedValue({ key: KEY, created: false });
  migrateMock.mockResolvedValue(0);
  deleteDatabaseAsync.mockResolvedValue(undefined);
  // Has to resolve, not return undefined: the code under test chains .catch()
  // onto it, and a bare jest.fn() would throw a TypeError that swallows the
  // error the caller was actually meant to see.
  deleteKey.mockResolvedValue(undefined);
});

afterEach(async () => {
  await closeJournalDatabase().catch(() => undefined);
  setPlatform(originalOS);
});

describe('getJournalDatabase', () => {
  it('keys the connection before anything touches the database', async () => {
    await getJournalDatabase();

    // If a statement that reads or writes precedes the key, SQLCipher has
    // already decided the file is not a database and the rest is noise. The one
    // thing allowed in front is cipher_version, which asks the library instead.
    const touchesData = db.statements.filter((sql) => !sql.includes('cipher_version'));
    expect(touchesData[0]).toBe(`PRAGMA key = "x'${KEY}'"`);
  });

  it('forces a decrypt before handing the connection out', async () => {
    await getJournalDatabase();

    const keyed = db.statements.indexOf(`PRAGMA key = "x'${KEY}'"`);
    expect(db.statements[keyed + 1]).toMatch(/FROM sqlite_master/);
  });

  it('sets WAL and foreign keys, then migrates', async () => {
    await getJournalDatabase();

    expect(db.statements).toEqual(
      expect.arrayContaining(['PRAGMA journal_mode = WAL', 'PRAGMA foreign_keys = ON'])
    );
    expect(migrateMock).toHaveBeenCalledWith(db);
  });

  it('opens once however many callers ask', async () => {
    const [first, second] = await Promise.all([getJournalDatabase(), getJournalDatabase()]);

    expect(first).toBe(second);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('refuses to run on web rather than falling back to an unencrypted database', async () => {
    setPlatform('web');

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(openDatabaseAsync).not.toHaveBeenCalled();
  });

  it('closes the handle and allows a retry when opening fails', async () => {
    migrateMock.mockRejectedValueOnce(new Error('migration exploded'));

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(db.closeAsync).toHaveBeenCalled();

    // The failed attempt must not be cached, or the app can never recover
    // without a restart.
    migrateMock.mockResolvedValue(0);
    await expect(getJournalDatabase()).resolves.toBeDefined();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('surfaces a key that cannot be read', async () => {
    getKey.mockRejectedValue(new Error('keychain locked'));
    await expect(getJournalDatabase()).rejects.toThrow();
    expect(openDatabaseAsync).not.toHaveBeenCalled();
  });
});

describe('a build without SQLCipher', () => {
  it('refuses to open rather than writing a plaintext journal', async () => {
    // The whole point. PRAGMA key is accepted and ignored by stock SQLite, and
    // the schema read afterwards succeeds against a plaintext file, so without
    // this check the app writes an unencrypted medical journal and says nothing.
    withoutSQLCipher();

    await expect(getJournalDatabase()).rejects.toThrow(SQLCipherUnavailableError);
  });

  it('checks before keying, so nothing is written to the file', async () => {
    withoutSQLCipher();

    await expect(getJournalDatabase()).rejects.toThrow(SQLCipherUnavailableError);
    expect(db.statements).toEqual(['PRAGMA cipher_version']);
  });

  it('tells the reader how to get a build that works', async () => {
    // Whoever hits this is running Expo Go or a stale prebuild, and the error
    // is the only place they will find out.
    withoutSQLCipher();

    await expect(getJournalDatabase()).rejects.toThrow(/expo prebuild/);
  });

  it('closes the handle it refused to use', async () => {
    withoutSQLCipher();

    await expect(getJournalDatabase()).rejects.toThrow(SQLCipherUnavailableError);
    expect(db.closeAsync).toHaveBeenCalled();
  });

  it('is not reported as a generic open failure', async () => {
    // "Could not open the journal database" would send someone looking at the
    // database. The problem is the binary.
    withoutSQLCipher();

    await expect(getJournalDatabase()).rejects.not.toThrow(DatabaseUnavailableError);
  });
});

describe('a journal that no key can open', () => {
  /** A key we just minted cannot fail against a file we just created. */
  function restoredFromAnotherPhone() {
    getKey.mockResolvedValue({ key: KEY, created: true });
    failToDecrypt();
  }

  /** SQLCipher is present; it is this particular file it cannot read. */
  function failToDecrypt() {
    db.getFirstAsync.mockImplementation(async (sql: string) => {
      db.statements.push(sql);
      if (sql.includes('cipher_version')) return CIPHER_VERSION;
      throw new Error('file is not a database');
    });
  }

  it('is reported as its own error rather than a generic open failure', async () => {
    // Restoring a backup onto a new phone brings journal.db back but not the
    // key, which 0015 keeps THIS_DEVICE_ONLY on purpose. Saying "could not open
    // the database" there is true and useless; this is the case that has to be
    // nameable so something can eventually offer to start over.
    restoredFromAnotherPhone();

    await expect(getJournalDatabase()).rejects.toThrow(UnrecoverableJournalError);
  });

  it('takes the useless key back out, so the next launch reaches the same branch', async () => {
    // Leaving it stored would make created=false next time, and the diagnosis
    // would degrade to a generic failure that explains nothing.
    restoredFromAnotherPhone();

    await expect(getJournalDatabase()).rejects.toThrow(UnrecoverableJournalError);
    expect(deleteKey).toHaveBeenCalled();
  });

  it('closes the handle it could not read', async () => {
    restoredFromAnotherPhone();

    await expect(getJournalDatabase()).rejects.toThrow(UnrecoverableJournalError);
    expect(db.closeAsync).toHaveBeenCalled();
  });

  it('does not blame a stored key for a decrypt failure, or delete it', async () => {
    // Same symptom, different cause: the key was already there, so this is
    // corruption or something else - not a journal from another phone. Deleting
    // the key here would destroy a database that might still be readable.
    getKey.mockResolvedValue({ key: KEY, created: false });
    failToDecrypt();

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(deleteKey).not.toHaveBeenCalled();
  });

  it('leaves a genuine first run alone', async () => {
    // Fresh install: key minted, empty file, decrypt fine. Nothing to report.
    getKey.mockResolvedValue({ key: KEY, created: true });

    await expect(getJournalDatabase()).resolves.toBeDefined();
    expect(deleteKey).not.toHaveBeenCalled();
  });
});

describe('closeJournalDatabase', () => {
  it('closes an open handle', async () => {
    await getJournalDatabase();
    await closeJournalDatabase();
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when nothing is open', async () => {
    await expect(closeJournalDatabase()).resolves.toBeUndefined();
    expect(db.closeAsync).not.toHaveBeenCalled();
  });
});

describe('destroyJournalDatabase', () => {
  it('deletes the database file before the key', async () => {
    const order: string[] = [];
    deleteDatabaseAsync.mockImplementation(async () => {
      order.push('file');
    });
    deleteKey.mockImplementation(async () => {
      order.push('key');
    });

    await getJournalDatabase();
    await destroyJournalDatabase();

    // Interrupted between the two, this order leaves an unreadable file rather
    // than a readable one whose key is gone.
    expect(order).toEqual(['file', 'key']);
    expect(db.closeAsync).toHaveBeenCalled();
  });

  it('still removes the key when the file was already gone', async () => {
    deleteDatabaseAsync.mockRejectedValue(new Error('no such file'));

    await expect(destroyJournalDatabase()).resolves.toBeUndefined();
    expect(deleteKey).toHaveBeenCalled();
  });
});
