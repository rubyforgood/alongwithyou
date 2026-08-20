// An in-memory stand-in for an open expo-sqlite database, for tests.
//
// The alternative was asserting on generated SQL strings, which passes happily
// while the query is wrong. This runs the real thing against real SQLite -
// node:sqlite, built into Node - so ordering, constraints, transaction rollback
// and `changes` counts are the genuine article rather than a fake's opinion.
//
// It covers only the handful of SQLiteDatabase methods this codebase calls. It
// is not, and should not grow into, a general expo-sqlite polyfill: what it
// cannot tell you is anything about SQLCipher, which has no Node build and
// needs a device. Encryption is verified on hardware (issue #101), not here.

import type { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * node:sqlite's `DatabaseSync`, or null on a Node that does not have it.
 *
 * The require is lazy on purpose. A static `import { DatabaseSync } from
 * 'node:sqlite'` is resolved before any code in this module runs, so on Node
 * below 22.5 the module throws at import time and no guard written here can
 * catch it - the dependent suites then error out instead of skipping. That is
 * issue #133, and `engines` currently permits 20.19.4.
 */
const DatabaseSyncClass: typeof DatabaseSync | null = (() => {
  try {
    return (require('node:sqlite') as typeof import('node:sqlite')).DatabaseSync;
  } catch {
    return null;
  }
})();

/** True when the running Node has node:sqlite (22.5+). */
export const HAS_NODE_SQLITE = DatabaseSyncClass !== null;

/**
 * expo-sqlite accepts either `run(sql, a, b)` or `run(sql, [a, b])`, and this
 * codebase uses both. Collapse them into one array.
 */
function normaliseParams(params: unknown[]): unknown[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as unknown[];
  return params;
}

export type InMemoryDatabase = SQLiteDatabase & { readonly raw: DatabaseSync };

export function createInMemoryDatabase(): InMemoryDatabase {
  if (!DatabaseSyncClass) {
    throw new Error(
      'node:sqlite is unavailable - this helper needs Node 22.5 or newer. Guard the suite with HAS_NODE_SQLITE.'
    );
  }

  const raw = new DatabaseSyncClass(':memory:');

  const db = {
    raw,

    async execAsync(sql: string) {
      raw.exec(sql);
    },

    async runAsync(sql: string, ...params: unknown[]) {
      const result = raw.prepare(sql).run(...(normaliseParams(params) as never[]));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },

    async getAllAsync(sql: string, ...params: unknown[]) {
      return raw.prepare(sql).all(...(normaliseParams(params) as never[]));
    },

    async getFirstAsync(sql: string, ...params: unknown[]) {
      // node:sqlite returns undefined for no rows; expo-sqlite returns null.
      return raw.prepare(sql).get(...(normaliseParams(params) as never[])) ?? null;
    },

    // Refuses on purpose, and this is the one method here that is worth
    // explaining. The real withExclusiveTransactionAsync does not run the
    // callback on the database you called it on: expo-sqlite's
    // `Transaction.createAsync` reopens the file with `useNewConnection: true`,
    // and `SQLiteOpenOptions` carries no key. `PRAGMA key` is per-connection,
    // so under SQLCipher that second handle cannot read the file at all.
    //
    // node:sqlite has one connection and nothing to hand out as a second, so
    // the only implementations available are "run it on this connection" and
    // "refuse". The first is what used to be here, and it asserted the opposite
    // of what the library does - which is precisely why migrations.ts went in
    // using a call that would have failed on the first real device migration
    // with every test green. Refusing keeps that failure in the suite.
    withExclusiveTransactionAsync(): Promise<void> {
      return Promise.reject(
        new Error(
          'withExclusiveTransactionAsync is deliberately not modelled: the real one runs on a new, unkeyed connection that cannot read a SQLCipher database. Use BEGIN IMMEDIATE / COMMIT on this connection instead.'
        )
      );
    },

    async closeAsync() {
      raw.close();
    },
  };

  return db as unknown as InMemoryDatabase;
}
