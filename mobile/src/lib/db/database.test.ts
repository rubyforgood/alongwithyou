import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  closeJournalDatabase,
  DatabaseUnavailableError,
  destroyJournalDatabase,
  getJournalDatabase,
  UnrecoverableJournalError,
} from './database';
import { deleteDatabaseKey, getOrCreateDatabaseKey } from './key';
import { migrate } from './migrations';

/**
 * The fake disk, keyed by URI. Jest hoists the factory below above the file, so
 * anything it closes over has to be `mock`-prefixed for the transform to allow
 * it.
 */
let mockFiles = new Set<string>();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
  defaultDatabaseDirectory: '/documents/SQLite',
}));

// expo-file-system's File is a class, so the stand-in has to be constructible.
// Only `exists` and `delete` are used here.
jest.mock('expo-file-system', () => ({
  File: class {
    readonly uri: string;
    constructor(directory: string, name: string) {
      this.uri = `${directory}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    delete() {
      if (!mockFiles.delete(this.uri)) throw new Error(`No such file: ${this.uri}`);
    }
  },
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

const DB_URI = 'file:///documents/SQLite/journal.db';
const WAL_URI = `${DB_URI}-wal`;
const SHM_URI = `${DB_URI}-shm`;

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

/** Records the statements run against it, in order. */
function fakeDatabase() {
  const statements: string[] = [];
  return {
    statements,
    execAsync: jest.fn(async (sql: string) => {
      statements.push(sql);
    }),
    getFirstAsync: jest.fn(async (sql: string) => {
      statements.push(sql);
      return { 'count(*)': 0 };
    }),
    closeAsync: jest.fn(async () => undefined),
  };
}

let db: ReturnType<typeof fakeDatabase>;

beforeEach(async () => {
  jest.clearAllMocks();
  setPlatform('ios');
  db = fakeDatabase();
  openDatabaseAsync.mockResolvedValue(db);
  getKey.mockResolvedValue({ key: KEY, created: false });
  migrateMock.mockResolvedValue(0);
  // A journal on disk with no leftover sidecars, which is what a clean close
  // leaves. Tests that care about the unclean case add them.
  mockFiles = new Set([DB_URI]);
  deleteDatabaseAsync.mockImplementation(async () => {
    mockFiles.delete(DB_URI);
  });
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
  it('keys the connection before doing anything else with it', async () => {
    await getJournalDatabase();

    // If any statement precedes the key, SQLCipher has already decided the file
    // is not a database and the rest is noise.
    expect(db.statements[0]).toBe(`PRAGMA key = "x'${KEY}'"`);
  });

  it('forces a decrypt before handing the connection out', async () => {
    await getJournalDatabase();
    expect(db.statements[1]).toMatch(/FROM sqlite_master/);
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

describe('a journal that no key can open', () => {
  /** A key we just minted cannot fail against a file we just created. */
  function restoredFromAnotherPhone() {
    getKey.mockResolvedValue({ key: KEY, created: true });
    db.getFirstAsync.mockRejectedValue(new Error('file is not a database'));
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
    db.getFirstAsync.mockRejectedValue(new Error('file is not a database'));

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

    // Interrupted between the two, this order leaves a key with nothing to
    // open, and the next launch is an ordinary first run. The reverse would
    // leave a file no key can open - UnrecoverableJournalError, which is the
    // state this whole control exists to get out of.
    expect(order).toEqual(['file', 'key']);
    expect(db.closeAsync).toHaveBeenCalled();
  });

  it('still removes the key when there was nothing on disk to remove', async () => {
    mockFiles.clear();

    await expect(destroyJournalDatabase()).resolves.toBeUndefined();
    // Nothing to delete, so nothing is asked to. "Already gone" is established
    // by looking rather than by catching, because deleteDatabaseAsync gives
    // that case the same error code as a delete that genuinely failed.
    expect(deleteDatabaseAsync).not.toHaveBeenCalled();
    expect(deleteKey).toHaveBeenCalled();
  });

  it('removes the WAL sidecars, which deleteDatabaseAsync leaves behind', async () => {
    mockFiles.add(WAL_URI);
    mockFiles.add(SHM_URI);

    await destroyJournalDatabase();

    expect(mockFiles.has(WAL_URI)).toBe(false);
    expect(mockFiles.has(SHM_URI)).toBe(false);
  });

  it('removes them even when the database file itself is already gone', async () => {
    // The state an unclean shutdown leaves: journal.db deleted or never
    // reopened, a -wal still holding entries under the key about to be deleted.
    mockFiles = new Set([WAL_URI, SHM_URI]);

    await destroyJournalDatabase();

    expect(mockFiles.size).toBe(0);
  });

  it('keeps the key when the journal could not be deleted', async () => {
    // Reporting success here and deleting the key anyway is issue #135: it
    // leaves a file no key can open, which is UnrecoverableJournalError -
    // exactly the state this control is meant to be the escape from.
    deleteDatabaseAsync.mockRejectedValue(new Error('currently open'));

    await expect(destroyJournalDatabase()).rejects.toThrow(/currently open/);
    expect(deleteKey).not.toHaveBeenCalled();
  });
});
