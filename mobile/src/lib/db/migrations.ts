// Schema migrations, tracked in SQLite's own `user_version` pragma.
//
// The pattern in Expo's docs is a hand-written if-ladder over the version
// number. That reads fine at one migration and badly at fifteen, and Phase 1
// alone adds a table per journal section, so this keeps the same mechanism -
// `user_version` as the source of truth, no metadata table of our own - behind
// a list you append to.

import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  /** 1-based, contiguous, and never reordered or renumbered once merged. */
  readonly id: number;
  /** Human label, only ever used in error messages. */
  readonly name: string;
  /** SQL applied to move the schema from `id - 1` to `id`. */
  readonly up: string;
};

/**
 * Every migration, in order.
 *
 * Deliberately empty: the storage foundation ships the mechanism, and the first
 * table belongs to the first feature that needs one - Caregiver/Emergency
 * Contacts, issue #118 - so that "foundation" and "the first screen" stay
 * separable in review. Append here; never edit a merged entry, because devices
 * in the field have already run it and only see what comes after.
 */
export const MIGRATIONS: readonly Migration[] = [];

export class MigrationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MigrationError';
  }
}

/** Rejects a list that would silently skip or re-run steps. */
function assertWellFormed(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    const expected = index + 1;
    if (migration.id !== expected) {
      throw new MigrationError(
        `Migrations must be numbered contiguously from 1: expected ${expected}, found ${migration.id} ("${migration.name}").`
      );
    }
  });
}

/** Current schema version of an open database. 0 for a fresh file. */
export async function currentVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Applies whatever has not been applied yet, and returns the resulting version.
 *
 * Each migration runs in its own exclusive transaction together with the
 * `user_version` bump, so an interrupted upgrade leaves the database on a
 * version that matches its actual schema rather than half-way through one.
 * withExclusiveTransactionAsync rather than withTransactionAsync because only
 * the former confines the transaction to the statements in the callback - with
 * the latter, anything else running concurrently gets swept into it.
 */
export async function migrate(
  db: SQLiteDatabase,
  migrations: readonly Migration[] = MIGRATIONS
): Promise<number> {
  assertWellFormed(migrations);

  let version = await currentVersion(db);

  if (version > migrations.length) {
    // The file was written by a newer build of the app - a TestFlight user
    // rolling back, say. Continuing would run the older code against a schema
    // it does not understand, so stop while everything is still intact.
    throw new MigrationError(
      `Database is at version ${version} but this build only knows ${migrations.length}. It was probably written by a newer version of the app.`
    );
  }

  for (const migration of migrations) {
    if (migration.id <= version) continue;

    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.execAsync(migration.up);
        // Not parameterisable - PRAGMA does not take bindings - but `id` is a
        // number from our own list, never user input.
        await txn.execAsync(`PRAGMA user_version = ${migration.id}`);
      });
    } catch (cause) {
      throw new MigrationError(
        `Migration ${migration.id} ("${migration.name}") failed. The database is still at version ${version}.`,
        { cause }
      );
    }

    version = migration.id;
  }

  return version;
}
