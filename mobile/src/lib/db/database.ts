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

  const key = await getOrCreateDatabaseKey();
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    // Has to be the first statement executed against the connection.
    await db.execAsync(rawKeyPragma(key));

    // Touch the schema to force SQLCipher to actually decrypt a page. Without
    // this, a wrong key is not discovered until the first real query, which
    // could be several screens away from the thing that caused it.
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');

    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    await migrate(db);
  } catch (cause) {
    // Do not leave a half-configured handle behind for the next caller.
    await db.closeAsync().catch(() => undefined);
    throw new DatabaseUnavailableError('Could not open the journal database.', { cause });
  }

  return db;
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
