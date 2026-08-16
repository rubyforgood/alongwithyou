// Opening the encrypted journal database.
//
// Everything a user writes lives here and nowhere else (0001), encrypted at
// rest with SQLCipher under a key from key.ts.
//
// Requires a development build. SQLCipher is a native fork of SQLite that
// expo-sqlite compiles in only when `useSQLCipher` is set in app.json, so it
// cannot work in Expo Go and the project needs `npx expo prebuild` and a dev
// client. That is a real change to how you run the app locally, and it is the
// price of the database being encrypted at all.

import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { migrate } from './migrations';
import { deleteDatabaseKey, getOrCreateDatabaseKey, rawKeyPragma } from './key';

const DATABASE_NAME = 'journal.db';

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseUnavailableError';
  }
}

/**
 * There is a journal on this device and no key that opens it. The data is gone.
 *
 * The path here is not exotic - it is the ordinary one. 0015 stores the key
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY precisely so it does *not* travel in an iCloud
 * backup, but `journal.db` lives in Documents and does. So restoring a backup
 * onto a new phone - which is what people do when they replace a handset -
 * brings back the file without the key.
 *
 * Treating that as a first run and minting a fresh key is the worst available
 * response: every read then fails, and the app is bricked on every launch after
 * with a message that explains nothing. So it is called out as its own error.
 * The journal genuinely cannot be recovered - 0007 commits to telling people
 * that during onboarding - but "your journal was made on a different phone and
 * cannot be opened here" is a true thing to say, and it leaves the user
 * somewhere to go. `destroyJournalDatabase` is the way to start over.
 *
 * The UI for that is not built; this is the mechanism it needs.
 */
export class UnrecoverableJournalError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UnrecoverableJournalError';
  }
}

/**
 * This build has no SQLCipher, so nothing here would be encrypted.
 *
 * The reason this needs its own check is that the failure is otherwise
 * completely silent. SQLite ignores pragmas it does not recognise rather than
 * erroring, so on a plain build `PRAGMA key` is accepted and does nothing, the
 * schema read afterwards succeeds against a plaintext file, and the app writes
 * an unencrypted medical journal with no error, no warning, and nothing that
 * distinguishes it from the encrypted case.
 *
 * That is not a theoretical build. `useSQLCipher` is applied by a config plugin
 * at prebuild, so Expo Go has never had it, and neither does a stale ios/ or
 * android/ directory generated before it was set.
 *
 * 0017 refuses an unencrypted fallback on web for exactly this reason - a
 * silent downgrade makes the privacy promise untrue in the way nobody notices
 * until it matters. The same has to hold for a build that lost SQLCipher.
 */
export class SQLCipherUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SQLCipherUnavailableError';
  }
}

/** Errors that already explain themselves; wrapping them would lose that. */
function isDiagnosed(error: unknown): boolean {
  return error instanceof UnrecoverableJournalError || error instanceof SQLCipherUnavailableError;
}

/**
 * Cached as the in-flight promise, not the resolved handle, so that two screens
 * mounting at once share one open rather than racing to create two. Cleared on
 * failure so a retry is not permanently poisoned by one bad open.
 */
let openPromise: Promise<SQLiteDatabase> | null = null;

async function open(): Promise<SQLiteDatabase> {
  // expo-sqlite runs on web via wasm, but SQLCipher does not: the docs list it
  // for Android, iOS and macOS only. Falling back to plain SQLite here would
  // give us a web build quietly writing an unencrypted medical journal to
  // origin-private storage, which is exactly the kind of silent downgrade that
  // makes a privacy promise untrue. Web is the marketing and landing surface
  // for this app; journal data does not belong there.
  if (Platform.OS === 'web') {
    throw new DatabaseUnavailableError(
      'The journal database is not available on web: SQLCipher has no web build, and an unencrypted fallback is not acceptable for this data.'
    );
  }

  const { key, created } = await getOrCreateDatabaseKey();
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    // Before the key, and before anything is written. `PRAGMA cipher_version`
    // interrogates the library rather than the database, so it is safe ahead of
    // the key, and asking first means a build that cannot encrypt fails against
    // an empty file instead of filling one with plaintext.
    await assertSQLCipher(db);

    // Has to be the first statement that touches the database.
    await db.execAsync(rawKeyPragma(key));

    await assertReadable(db, created);

    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    await migrate(db);
  } catch (cause) {
    // Do not leave a half-configured handle behind for the next caller.
    await db.closeAsync().catch(() => undefined);
    if (isDiagnosed(cause)) throw cause;
    throw new DatabaseUnavailableError('Could not open the journal database.', { cause });
  }

  return db;
}

/**
 * Confirms the running binary is actually linked against SQLCipher.
 *
 * `PRAGMA cipher_version` returns a version string on a SQLCipher build and no
 * row at all on stock SQLite, which makes it the only cheap way to tell the two
 * apart - `PRAGMA key` cannot, because a plain build accepts it and ignores it.
 */
async function assertSQLCipher(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (row?.cipher_version) return;

  throw new SQLCipherUnavailableError(
    'This build of the app has no SQLCipher, so the journal would be stored unencrypted. Run `npx expo prebuild` and start a development build - Expo Go cannot run this app.'
  );
}

/**
 * Reads a page, so a key that does not fit this file is discovered here rather
 * than several screens away at the first real query.
 *
 * Given `keyWasCreated` it also catches the restored-backup case. A key we just
 * minted cannot fail to read a database we just created, so if it fails the
 * file was already there and belonged to a key that is gone.
 */
async function assertReadable(db: SQLiteDatabase, keyWasCreated: boolean): Promise<void> {
  try {
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
  } catch (cause) {
    if (!keyWasCreated) throw cause;

    // Take the useless key back out. Leaving it would turn a diagnosable state
    // into an undiagnosable one: the next launch would read a stored key, and
    // this branch - the only thing that knows what actually happened - would
    // never run again.
    await deleteDatabaseKey().catch(() => undefined);

    throw new UnrecoverableJournalError(
      'There is a journal on this device that no key can open. It was almost certainly restored from a backup of another phone, which does not carry the key. The journal cannot be recovered; starting a new one means erasing it.',
      { cause }
    );
  }
}

/** The shared database handle, opening and migrating it on first call. */
export function getJournalDatabase(): Promise<SQLiteDatabase> {
  openPromise ??= open().catch((error: unknown) => {
    openPromise = null;
    throw error;
  });
  return openPromise;
}

/** Closes the handle if one is open. Safe to call when none is. */
export async function closeJournalDatabase(): Promise<void> {
  const pending = openPromise;
  if (!pending) return;
  openPromise = null;

  const db = await pending.catch(() => null);
  await db?.closeAsync();
}

/**
 * Erases the journal: the database file first, then the key.
 *
 * This is the mechanism behind the "Delete all my data" control 0007 requires
 * and issue #116 tracks. File before key, so that an interruption between the
 * two leaves an unreadable database rather than a readable one with no key -
 * either way there is nothing recoverable, but only one of those orders is
 * still true to the promise if the process dies half-way.
 */
export async function destroyJournalDatabase(): Promise<void> {
  await closeJournalDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME).catch(() => undefined);
  await deleteDatabaseKey();
}
