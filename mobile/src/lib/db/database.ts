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

import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { migrate } from './migrations';
import { deleteDatabaseKey, getOrCreateDatabaseKey, rawKeyPragma } from './key';

const DATABASE_NAME = 'journal.db';

/**
 * What WAL mode leaves beside the database, and `deleteDatabaseAsync` does not
 * remove - it deletes only the file it is named after, a single `removeItem` on
 * iOS and `File.delete()` on Android.
 *
 * A clean close checkpoints these and removes them, so they survive exactly
 * when the last close was not clean: a crash, or a force-quit, which is how
 * most people close a phone app. Left behind they hold journal pages that
 * "Delete all my data" is supposed to have erased, and the next launch creates
 * a fresh `journal.db` beside a WAL encrypted under a key that no longer
 * exists.
 */
const SIDECAR_SUFFIXES = ['-wal', '-shm'] as const;

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
 * A file in expo-sqlite's directory, in the form `File` needs.
 *
 * `defaultDatabaseDirectory` is a bare filesystem path on both platforms - iOS
 * builds it from `documentDirectory...standardized.path`, Android from
 * `filesDir.canonicalPath`. iOS's URL conversion accepts a bare path, but
 * Android resolves it through `java.io.File(URI.create(...))`, which rejects a
 * URI with no scheme, so the scheme is added here rather than left to whichever
 * platform happens to tolerate its absence.
 */
function databaseFile(name: string): File {
  const directory: string = SQLite.defaultDatabaseDirectory;
  return new File(`file://${directory}`, name);
}

/**
 * Removes the database and everything beside it, and throws if anything is
 * left. `destroyJournalDatabase` deletes the key only once this has returned,
 * which is the whole point of it throwing - see the ordering note there.
 *
 * "Already gone" is the one acceptable failure, and it is settled by looking
 * rather than by catching, because a catch cannot tell it from the others:
 * `DatabaseNotFoundException`, `DeleteDatabaseException` (something still holds
 * the database open) and `DeleteDatabaseFileException` all carry the same
 * `E_SQLITE_DELETE_DATABASE` code. Swallowing all three reports success while
 * leaving the journal on disk, which is issue #135.
 */
async function deleteDatabaseFiles(): Promise<void> {
  // deleteDatabaseAsync rather than File.delete for the database itself: it
  // refuses to remove one that still has an open connection, and that check is
  // worth keeping.
  if (databaseFile(DATABASE_NAME).exists) {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  }

  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = databaseFile(`${DATABASE_NAME}${suffix}`);
    if (sidecar.exists) sidecar.delete();
  }
}

/**
 * Erases the journal: the files first, then the key.
 *
 * This is the mechanism behind the "Delete all my data" control 0007 requires
 * and issue #116 tracks. The order matters whenever the two steps do not both
 * complete - because the first one threw, or because the process died in
 * between - and it decides what the user finds when that happens.
 *
 * Files first leave a key with nothing to open, and the next launch reads that
 * key and creates an empty journal - a clean start, which is what was asked
 * for. Key first would leave a file no key can open: `UnrecoverableJournalError`
 * above, reached by exactly the path this is meant to be the escape from. A
 * half-finished delete would be indistinguishable from a journal restored off
 * someone else's phone, and the app would say so instead of starting over.
 *
 * Both orders destroy the data. Only one of them leaves the app somewhere the
 * user can go - which is also why `deleteDatabaseFiles` throws rather than
 * reporting a success it cannot verify. A file still on disk when the key goes
 * is the key-first state by another route.
 */
export async function destroyJournalDatabase(): Promise<void> {
  await closeJournalDatabase();
  await deleteDatabaseFiles();
  await deleteDatabaseKey();
}
