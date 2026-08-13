import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  closeJournalDatabase,
  DatabaseUnavailableError,
  destroyJournalDatabase,
  getJournalDatabase,
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
  getKey.mockResolvedValue(KEY);
  migrateMock.mockResolvedValue(0);
  deleteDatabaseAsync.mockResolvedValue(undefined);
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
