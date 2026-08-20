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

/**
 * The close in flight, if there is one.
 *
 * `closeJournalDatabase` has to drop the cached open *before* it awaits
 * `closeAsync`, or a caller arriving mid-close would be handed a handle that is
 * already shutting down. That leaves a window where nothing records that the
 * file is still owned, and `getJournalDatabase` would open a second connection
 * across it. This is what fills the window.
 */
let closePromise: Promise<void> | null = null;

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

    // Before assertReadable, which cannot tell an encrypted file it decrypted
    // from a plaintext one it never had to.
    await assertEncrypted(db);

    await assertReadable(db, created);

    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    await migrate(db);
  } catch (cause) {
    // Do not leave a half-configured handle behind for the next caller.
    await db.closeAsync().catch(() => undefined);
    if (cause instanceof UnrecoverableJournalError) throw cause;
    // Already both specific and accurate - re-wrapping would bury the one
    // sentence that says what to do about it.
    if (cause instanceof DatabaseUnavailableError) throw cause;
    throw new DatabaseUnavailableError('Could not open the journal database.', { cause });
  }

  return db;
}

/**
 * Refuses to carry on when the binary has no SQLCipher in it.
 *
 * `PRAGMA key` is not evidence of anything. SQLite's response to a pragma it
 * does not recognise is to ignore it - no error, no warning, no rows - so on a
 * plain SQLite build the keying statement above succeeds, every read and write
 * after it succeeds, and the journal is written in cleartext while the app
 * behaves in every observable way as though it were not. That is the failure
 * this project can least afford to let pass quietly, and issue #130 is it.
 *
 * `PRAGMA cipher_version` is the discriminator, and it works *because* of the
 * same rule that causes the bug. SQLCipher implements it and answers with a
 * single row holding its version string; stock SQLite has never heard of it and
 * so returns no rows at all. Absence is the signal, which is why this tests the
 * value rather than waiting for a throw - neither build throws.
 *
 * The two sides of that are checkable in this repo rather than taken on trust:
 * `vendor/sqlcipher/sqlite3.c` in expo-sqlite answers `cipher_version` from its
 * pragma table, and `vendor/sqlite3/sqlite3.c` - the source compiled in when
 * `useSQLCipher` is absent - does not contain the string.
 *
 * It throws rather than warning. 0017 already settled the principle for web: a
 * downgrade from encrypted to plaintext is not a reduced service this app
 * offers, so there is no degraded mode to continue into, and a warning is a
 * line in a log nobody reads while the journal is written in the clear
 * regardless. Nor can this strand a user on a correct build - whether SQLCipher
 * is compiled in is fixed when the binary is built, so it fails identically on
 * every launch of a misbuilt app and on none of a good one. It surfaces on the
 * machine of whoever skipped `npx expo prebuild`, which is where it is fixable.
 *
 * What no test on a laptop can show is the *passing* side: node:sqlite is stock
 * SQLite, so CI can only ever prove that a non-SQLCipher build is rejected. That
 * a real SQLCipher build satisfies this needs a device - issue #101.
 */
async function assertEncrypted(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version');

  if (!row?.cipher_version) {
    throw new DatabaseUnavailableError(
      'This build has no SQLCipher, so the journal would be stored unencrypted. Rebuild with `useSQLCipher` set for expo-sqlite in app.json and run `npx expo prebuild`; Expo Go cannot run this app.'
    );
  }
}

/**
 * Reads a page, so a key that does not fit this file is discovered here rather
 * than several screens away at the first real query.
 *
 * This says nothing about whether the file is encrypted - a plaintext database
 * reads perfectly. `assertEncrypted` above runs first for that reason.
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
  openPromise ??= openOnceClosed().catch((error: unknown) => {
    openPromise = null;
    throw error;
  });
  return openPromise;
}

/**
 * Waits out a close still in progress, then opens.
 *
 * Without the wait, a `getJournalDatabase()` arriving while `closeAsync` is
 * still running opens a second connection to a file the first one has not let
 * go of. Two things then go wrong, and neither is theoretical now that the
 * unlock gate closes the database from an AppState listener - backgrounding the
 * app races every screen that is mid-query.
 *
 * The first is that locking stops locking. The gate closes the handle so the
 * decrypted database and its key do not outlive the foreground; an open that
 * slips in behind it hands back a fresh decrypted handle moments later, and the
 * cached promise now points at *that* one, so the close completes against a
 * connection nobody is using any more.
 *
 * The second is `destroyJournalDatabase`, which cannot delete a file while a
 * connection to it is cached - see the note there.
 *
 * A close that fails is still a close that finished, so the rejection is
 * swallowed here rather than blocking every future open on one bad teardown.
 */
async function openOnceClosed(): Promise<SQLiteDatabase> {
  await closePromise?.catch(() => undefined);
  return open();
}

/** Closes the handle if one is open. Safe to call when none is. */
export async function closeJournalDatabase(): Promise<void> {
  const pending = openPromise;
  if (!pending) {
    // Nothing of ours to close, but a close another caller started may still be
    // running. Returning now would report "closed" while the file is open,
    // which is exactly the lie destroyJournalDatabase must not be told.
    await closePromise;
    return;
  }

  // Dropped before the await so nobody is handed a handle that is on its way
  // out; closePromise below is what keeps the file accounted for meanwhile.
  openPromise = null;

  const closing = (async () => {
    const db = await pending.catch(() => null);
    await db?.closeAsync();
  })();

  // Published in the same synchronous turn as the line above - the body of
  // `closing` suspends at its first await - so there is no tick in which both
  // are null and an open could slip between them.
  closePromise = closing;

  try {
    await closing;
  } finally {
    // Only if it is still ours: a later close may already have replaced it.
    if (closePromise === closing) closePromise = null;
  }
}

/**
 * Erases the journal: the database file first, then the key.
 *
 * This is the mechanism behind the "Delete all my data" control 0007 requires
 * and issue #116 tracks. The order matters only if the process dies between the
 * two steps, but it decides what the user finds when it does.
 *
 * File first leaves a key with nothing to open, and the next launch reads that
 * key and creates an empty journal - a clean start, which is what was asked
 * for. Key first would leave a file no key can open: `UnrecoverableJournalError`
 * above, reached by exactly the path this is meant to be the escape from. A
 * half-finished delete would be indistinguishable from a journal restored off
 * someone else's phone, and the app would say so instead of starting over.
 *
 * Both orders destroy the data. Only one of them leaves the app somewhere the
 * user can go.
 *
 * Ordering the two steps is not on its own enough, which is what issue #135 was
 * about. If the first step fails and the second runs anyway, the order bought
 * nothing: the outcome is the same key-less file, arrived at without the process
 * needing to die at all. So a failed delete aborts here rather than being
 * swallowed, and only a file that was already absent counts as a delete that
 * succeeded.
 */
export async function destroyJournalDatabase(): Promise<void> {
  await closeJournalDatabase();

  try {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  } catch (cause) {
    if (!isDatabaseAlreadyGone(cause)) {
      // Stop here, before the key. The file is still on disk, and deleting the
      // key on top of it produces the one outcome the ordering above exists to
      // prevent - reached, absurdly, by the control that is meant to be the way
      // out of it.
      throw new DatabaseUnavailableError(
        'The journal could not be erased, so nothing was erased and it is still readable. Please try again.',
        { cause }
      );
    }
  }

  await deleteDatabaseKey();
}

/**
 * True for the single delete failure that is not one: there was no file.
 *
 * This has to be a guess about a string, and it is worth being clear about why.
 * expo-sqlite throws for a missing file (`DatabaseNotFoundException`) exactly as
 * it throws when the database is still open (`DeleteDatabaseException`) or when
 * the unlink fails outright (`DeleteDatabaseFileException`), and the SDK
 * documents none of the three. There is no shared code to switch on either: iOS
 * files all three under `E_SQLITE_DELETE_DATABASE`. The message is what is left,
 * and it is at least consistent across platforms - "Database <name> not found"
 * on Android, "Database <path> not found" on iOS.
 *
 * So this is deliberately narrow, and deliberately fragile in the safe
 * direction. If a future SDK rewords the message, the match fails and erasing an
 * already-empty journal reports an error instead of finishing quietly: wrong,
 * visible, and harmless - the next launch starts clean anyway. The failure this
 * replaces was the other kind. `.catch(() => undefined)` treated "still open"
 * as success, destroyed the key, left the file, and said it had worked.
 */
function isDatabaseAlreadyGone(error: unknown): boolean {
  return error instanceof Error && /not found/i.test(error.message);
}
