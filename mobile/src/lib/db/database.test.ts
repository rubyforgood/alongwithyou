import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { createInMemoryDatabase, HAS_NODE_SQLITE } from '../../../jest/in-memory-sqlite';
import {
  closeJournalDatabase,
  DatabaseUnavailableError,
  destroyJournalDatabase,
  getJournalDatabase,
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

/**
 * Records the statements run against it, in order.
 *
 * Answers `PRAGMA cipher_version` like a SQLCipher build, because that is the
 * build the app is meant to run on and every test that is not about #130 should
 * be describing that world. The plaintext build gets its own fake below.
 */
function fakeDatabase() {
  const statements: string[] = [];
  return {
    statements,
    execAsync: jest.fn(async (sql: string) => {
      statements.push(sql);
    }),
    // Return types are stated rather than inferred: tests below replace these
    // with a null (no such pragma) or a promise that resolves later, and an
    // inferred type from the happy path alone rejects both.
    getFirstAsync: jest.fn(async (sql: string): Promise<Record<string, unknown> | null> => {
      statements.push(sql);
      if (sql.includes('cipher_version')) return { cipher_version: '4.5.7 community' };
      return { 'count(*)': 0 };
    }),
    closeAsync: jest.fn((): Promise<void> => Promise.resolve()),
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
  it('keys the connection before doing anything else with it', async () => {
    await getJournalDatabase();

    // If any statement precedes the key, SQLCipher has already decided the file
    // is not a database and the rest is noise.
    expect(db.statements[0]).toBe(`PRAGMA key = "x'${KEY}'"`);
  });

  it('forces a decrypt before handing the connection out', async () => {
    await getJournalDatabase();

    const read = db.statements.findIndex((sql) => /FROM sqlite_master/.test(sql));
    const wal = db.statements.indexOf('PRAGMA journal_mode = WAL');

    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(wal);
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
  // #130. `PRAGMA key` against plain SQLite is an unknown pragma, and SQLite
  // ignores unknown pragmas: it does not throw, so nothing downstream of it can
  // notice, and the journal is written in cleartext by an app that looks
  // entirely healthy. `PRAGMA cipher_version` is the only thing that separates
  // the two builds, and it separates them by returning nothing.

  it('refuses to open rather than writing the journal in cleartext', async () => {
    db.getFirstAsync.mockImplementation(async (sql: string) => {
      db.statements.push(sql);
      // What stock SQLite does with a pragma it does not implement.
      if (sql.includes('cipher_version')) return null;
      return { 'count(*)': 0 };
    });

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
  });

  it('says which build is wrong and how to fix it', async () => {
    // The person who hits this is a developer who skipped `npx expo prebuild`,
    // and the message is the whole diagnosis they get.
    db.getFirstAsync.mockImplementation(async () => null);

    await expect(getJournalDatabase()).rejects.toThrow(/SQLCipher/);
    await expect(getJournalDatabase()).rejects.toThrow(/prebuild/);
  });

  it('checks before reading, so a plaintext file cannot pass as a decrypted one', async () => {
    db.getFirstAsync.mockImplementation(async (sql: string) => {
      db.statements.push(sql);
      if (sql.includes('cipher_version')) return null;
      return { 'count(*)': 0 };
    });

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);

    // A plaintext database reads perfectly, so assertReadable would have said
    // yes. Order is the only thing stopping it.
    expect(db.statements.some((sql) => /FROM sqlite_master/.test(sql))).toBe(false);
  });

  it('does not mistake a stored key for the problem, or delete it', async () => {
    // The key is fine. The binary is wrong. Deleting the key here would destroy
    // a perfectly good journal over a build misconfiguration.
    getKey.mockResolvedValue({ key: KEY, created: true });
    db.getFirstAsync.mockImplementation(async () => null);

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(deleteKey).not.toHaveBeenCalled();
  });

  it('closes the connection it refused to use', async () => {
    db.getFirstAsync.mockImplementation(async () => null);

    await expect(getJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(db.closeAsync).toHaveBeenCalled();
  });
});

// The fake above only proves the code does what the fake was told to say. This
// runs the real open path against real, genuinely non-SQLCipher SQLite -
// node:sqlite is stock - so `PRAGMA key` is accepted and ignored for real and
// `PRAGMA cipher_version` comes back empty for real. It is the exact build #130
// is about.
//
// The other direction cannot be tested here at all: there is no SQLCipher for
// Node, so nothing on CI can show that a real SQLCipher build passes this check.
// That is device work - issue #101.
const describeSql = HAS_NODE_SQLITE ? describe : describe.skip;

describeSql('against real stock SQLite', () => {
  it('is caught by the cipher check and nothing else', async () => {
    const real = createInMemoryDatabase();
    openDatabaseAsync.mockResolvedValue(real);

    // Not a mock: stock SQLite really does accept the keying statement without
    // complaint, which is the whole reason the check below has to exist.
    await expect(real.execAsync(`PRAGMA key = "x'${KEY}'"`)).resolves.toBeUndefined();
    await expect(real.getFirstAsync('PRAGMA cipher_version')).resolves.toBeNull();

    await expect(getJournalDatabase()).rejects.toThrow(/SQLCipher/);

    // And it never got as far as creating anything.
    expect(migrateMock).not.toHaveBeenCalled();
  });
});

/**
 * A SQLCipher build holding a key that does not fit the file.
 *
 * Only the read fails. `PRAGMA cipher_version` still answers, and that is a
 * property of SQLCipher rather than a convenience here: it reports what the
 * binary was compiled with, so it does not depend on the key being right or on
 * the file having decrypted. (In the vendored amalgamation it returns a
 * compile-time constant, unguarded - unlike `cipher_provider_version` next to
 * it, which needs a codec context and would therefore report a wrong key as a
 * missing SQLCipher. That is why the check uses this pragma and not that one.)
 *
 * Rejecting every pragma instead would describe a build with no SQLCipher at
 * all, which is a different fault with a different message.
 */
function decryptFails() {
  db.getFirstAsync.mockImplementation(async (sql: string) => {
    db.statements.push(sql);
    if (sql.includes('cipher_version')) return { cipher_version: '4.5.7 community' };
    throw new Error('file is not a database');
  });
}

describe('a journal that no key can open', () => {
  /** A key we just minted cannot fail against a file we just created. */
  function restoredFromAnotherPhone() {
    getKey.mockResolvedValue({ key: KEY, created: true });
    decryptFails();
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
    decryptFails();

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

  /**
   * Holds closeAsync open until the test lets it finish, so "during the close"
   * is an actual window rather than a hope about microtask ordering.
   */
  function slowClose() {
    let release!: () => void;
    const closed = new Promise<void>((resolve) => {
      release = resolve;
    });
    db.closeAsync.mockImplementation(() => closed);
    return release;
  }

  it('does not let a concurrent open start a second connection mid-close', async () => {
    // The unlock gate closes from an AppState listener, so this interleaving
    // happens every time the app is backgrounded with a screen mid-query.
    await getJournalDatabase();
    const release = slowClose();

    const closing = closeJournalDatabase();
    const reopening = getJournalDatabase();

    // Still one open: the second must be waiting on the close, not racing it.
    // Before the fix openPromise was already null here, so this was a fresh
    // open against a file the first connection had not released.
    await Promise.resolve();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);

    release();
    await closing;
    await reopening;

    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('waits for a close another caller started before reporting closed', async () => {
    // destroyJournalDatabase depends on this: it deletes the file straight
    // after, and expo-sqlite refuses to delete one that is still open.
    await getJournalDatabase();
    const release = slowClose();

    const first = closeJournalDatabase();
    let secondFinished = false;
    const second = closeJournalDatabase().then(() => {
      secondFinished = true;
    });

    await Promise.resolve();
    expect(secondFinished).toBe(false);

    release();
    await Promise.all([first, second]);
    expect(secondFinished).toBe(true);
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

  it('still removes the key when the file was already gone', async () => {
    // expo-sqlite throws for a missing file rather than resolving. Both
    // platforms word it this way; see isDatabaseAlreadyGone.
    deleteDatabaseAsync.mockRejectedValue(new Error("Database 'journal.db' not found"));

    await expect(destroyJournalDatabase()).resolves.toBeUndefined();
    expect(deleteKey).toHaveBeenCalled();
  });

  it('keeps the key when the file is still open, rather than stranding it', async () => {
    // #135. The native layer refuses to delete a database that is still open,
    // and it throws to say so - the same way it throws when the file is
    // missing. Swallowing both destroyed the key while leaving the file: a
    // journal no key can open, produced by the control that exists to escape
    // that state, and reported as success.
    deleteDatabaseAsync.mockRejectedValue(
      new Error("Unable to delete database 'journal.db' that is currently open. Close it prior to deletion.")
    );

    await expect(destroyJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(deleteKey).not.toHaveBeenCalled();
  });

  it('keeps the key when the file could not be unlinked', async () => {
    deleteDatabaseAsync.mockRejectedValue(
      new Error("Unable to delete the database file for 'journal.db' database")
    );

    await expect(destroyJournalDatabase()).rejects.toThrow(DatabaseUnavailableError);
    expect(deleteKey).not.toHaveBeenCalled();
  });

  it('tells the user nothing was erased, because nothing was', async () => {
    // A "delete my data" control that fails silently is worse than one that
    // fails: the user walks away believing the journal is gone.
    deleteDatabaseAsync.mockRejectedValue(new Error('currently open'));

    await expect(destroyJournalDatabase()).rejects.toThrow(/still readable/);
  });

  it('does not delete the file while a close someone else started is running', async () => {
    // The realistic race, not a contrived one: the unlock gate closes on
    // background, and the user taps "Delete all my data" while that close is
    // still in flight. destroyJournalDatabase's own close then finds nothing
    // cached and, before the fix, returned straight away - so the delete landed
    // on a file that was still open, and the key went with it.
    await getJournalDatabase();

    let closed = false;
    let release!: () => void;
    const closing = new Promise<void>((resolve) => {
      release = resolve;
    });
    db.closeAsync.mockImplementation(async () => {
      await closing;
      closed = true;
    });

    let deletedWhileOpen = false;
    deleteDatabaseAsync.mockImplementation(async () => {
      if (!closed) deletedWhileOpen = true;
    });

    // The gate's close, left in flight.
    const gateClose = closeJournalDatabase();

    const destroying = destroyJournalDatabase();
    await Promise.resolve();
    expect(deleteDatabaseAsync).not.toHaveBeenCalled();

    release();
    await Promise.all([gateClose, destroying]);

    expect(deletedWhileOpen).toBe(false);
    expect(deleteKey).toHaveBeenCalled();
  });
});
