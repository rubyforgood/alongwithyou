// A minimal declaration for the part of node:sqlite that jest/in-memory-sqlite.ts
// uses.
//
// @types/node ships its own, but nothing loads it here: Expo's tsconfig sets
// moduleResolution "bundler", which skips `node:`-prefixed specifiers as though
// they were URIs unless "node" is listed in compilerOptions.types. Adding that
// field would turn off the automatic inclusion of every other @types package -
// jest's globals among them - so this declares the handful of members in play
// instead and leaves the project's type configuration alone.
//
// If a future tsconfig does add "node" to types, delete this file; the two
// declarations would collide.

declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
