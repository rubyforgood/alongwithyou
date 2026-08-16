// The repeatable-entry data layer.
//
// Most of Phase 1 is the same shape: a list of small records you can add to,
// edit and delete - contacts, providers, allergies, chronic conditions,
// hospitalisations, family history. 0008 asks for that pattern to be built once
// and reused rather than rediscovered per screen, so the storage half lives
// here and the UI half (issues #49 and #118) is built on top of it.
//
// This is the data layer only. It knows nothing about React, and deliberately
// nothing about any particular journal section either - a section is a table
// name plus a list of columns, declared where the feature lives.

import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getJournalDatabase } from './database';

/** What SQLite will accept as a bound value for these simple records. */
export type FieldValue = string | number | null;

export type FieldSet = Record<string, FieldValue>;

/** Columns every repeatable entry carries, managed here rather than by callers. */
export type EntryMeta = {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Entry<TFields extends FieldSet> = TFields & EntryMeta;

export type RepositoryConfig<TFields extends FieldSet> = {
  readonly table: string;
  readonly fields: readonly (keyof TFields & string)[];
};

export type Repository<TFields extends FieldSet> = {
  list(): Promise<Entry<TFields>[]>;
  find(id: string): Promise<Entry<TFields> | null>;
  create(fields: TFields): Promise<Entry<TFields>>;
  update(id: string, changes: Partial<TFields>): Promise<Entry<TFields>>;
  remove(id: string): Promise<void>;
};

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Table and column names cannot be bound as parameters, so they are
 * interpolated - which means they have to be checked rather than trusted.
 *
 * These names come from a config object written by a developer, not from
 * anything a user types, so this is a guard against a typo becoming a very
 * confusing bug, not a defence against hostile input. Values always go through
 * bindings.
 */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function checkIdentifier(kind: string, name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new RepositoryError(`Invalid ${kind} name: ${JSON.stringify(name)}.`);
  }
  return name;
}

/** Column names that this module owns; a feature cannot redeclare them. */
const RESERVED = new Set(['id', 'created_at', 'updated_at']);

/**
 * Builds a repository for one repeatable-entry table.
 *
 * `getDatabase` is injectable so tests can drive a real in-memory SQLite
 * database instead of the encrypted one, which needs a device to exist.
 */
export function createRepository<TFields extends FieldSet>(
  config: RepositoryConfig<TFields>,
  getDatabase: () => Promise<SQLiteDatabase> = getJournalDatabase
): Repository<TFields> {
  const table = checkIdentifier('table', config.table);

  if (config.fields.length === 0) {
    throw new RepositoryError(`Repository for "${table}" declares no fields.`);
  }

  const fields = config.fields.map((field) => {
    checkIdentifier('column', field);
    if (RESERVED.has(field)) {
      throw new RepositoryError(
        `Column "${field}" on "${table}" is managed by the repository and cannot be declared as a field.`
      );
    }
    return field;
  });

  const selection = ['id', 'created_at AS createdAt', 'updated_at AS updatedAt', ...fields].join(
    ', '
  );

  // Oldest first, with id as a tiebreak so that two entries added in the same
  // millisecond keep a stable order between renders instead of swapping around.
  const ordering = 'ORDER BY created_at ASC, id ASC';

  // A plain function rather than a method, deliberately. `update` needs to read
  // a row back, and reaching a sibling through `this` breaks the moment anyone
  // writes `const { update } = repo` or passes `repo.update` as a callback -
  // both ordinary in React, neither caught by TypeScript, and the failure is a
  // TypeError at runtime.
  async function find(id: string): Promise<Entry<TFields> | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Entry<TFields>>(
      `SELECT ${selection} FROM ${table} WHERE id = ?`,
      id
    );
    return row ?? null;
  }

  /**
   * The declared fields, and only those, with anything the caller left out
   * turned into the NULL that will actually be stored.
   *
   * This is what `create` returns rather than the caller's own object, so that
   * the entry it hands back matches the row `find` reads. Spreading the input
   * instead lets an omitted field come back as `undefined` while the database
   * holds `null`, and lets keys that were never columns travel onwards as
   * though they had been saved.
   */
  function normalise(values: Partial<TFields>): TFields {
    return Object.fromEntries(fields.map((field) => [field, values[field] ?? null])) as TFields;
  }

  return {
    async list() {
      const db = await getDatabase();
      return db.getAllAsync<Entry<TFields>>(`SELECT ${selection} FROM ${table} ${ordering}`);
    },

    find,

    async create(values) {
      const db = await getDatabase();
      const id = Crypto.randomUUID();
      const now = new Date().toISOString();
      const stored = normalise(values);

      const columns = ['id', 'created_at', 'updated_at', ...fields];
      const placeholders = columns.map(() => '?').join(', ');
      const bound = [id, now, now, ...fields.map((field) => stored[field])];

      await db.runAsync(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        bound as FieldValue[]
      );

      return { ...stored, id, createdAt: now, updatedAt: now };
    },

    async update(id, changes) {
      const db = await getDatabase();

      const changed = fields.filter((field) => field in changes);
      if (changed.length === 0) {
        // Nothing to write. Returning the row as-is beats touching updatedAt
        // for an edit that changed nothing.
        const current = await find(id);
        if (!current) throw new RepositoryError(`No ${table} entry with id ${id}.`);
        return current;
      }

      const now = new Date().toISOString();
      const assignments = [...changed.map((field) => `${field} = ?`), 'updated_at = ?'].join(', ');
      const bound = [...changed.map((field) => changes[field] ?? null), now, id];

      const result = await db.runAsync(
        `UPDATE ${table} SET ${assignments} WHERE id = ?`,
        bound as FieldValue[]
      );

      if (result.changes === 0) {
        throw new RepositoryError(`No ${table} entry with id ${id}.`);
      }

      const updated = await find(id);
      if (!updated) throw new RepositoryError(`No ${table} entry with id ${id}.`);
      return updated;
    },

    async remove(id) {
      const db = await getDatabase();
      const result = await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
      if (result.changes === 0) {
        throw new RepositoryError(`No ${table} entry with id ${id}.`);
      }
    },
  };
}

/**
 * The columns every repeatable-entry table needs, for use in the CREATE TABLE
 * of a migration. Kept next to the repository that reads them so the two cannot
 * drift apart.
 */
export const ENTRY_COLUMNS_SQL = [
  'id TEXT PRIMARY KEY NOT NULL',
  'created_at TEXT NOT NULL',
  'updated_at TEXT NOT NULL',
].join(', ');
