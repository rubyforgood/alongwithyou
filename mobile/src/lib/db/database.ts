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
    // Has to be the first statement executed against the connection.
    await db.execAsync(rawKeyPragma(key));

    await assertReadable(db, created);

    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    await migrate(db);
  } catch (cause) {
    // Do not leave a half-configured handle behind for the next caller.
    await db.closeAsync().catch(() => undefined);
    if (cause instanceof UnrecoverableJournalError) throw cause;
    throw new DatabaseUnavailableError('Could not open the journal database.', { cause });
  }

  return db;
}

/**
 * Reads a page, so a key that does not fit this file is discovered here rather
 * than several screens away at the first real query.
 *
 * What this does not catch: on a build without SQLCipher, `PRAGMA key` is
 * silently ignored - SQLite ignores unknown pragmas - and this read succeeds
 * against a plaintext file. Detecting that needs `PRAGMA cipher_version`; see
 * issue #130.
 *
 * What it does catch, given `keyWasCreated`, is the restored-backup case. A key
 * we just minted cannot fail to read a database we just created, so if it fails
 * the file was already there and belonged to a key that is gone.
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
