import { createInMemoryDatabase, HAS_NODE_SQLITE } from '../../../jest/in-memory-sqlite';
import type { InMemoryDatabase } from '../../../jest/in-memory-sqlite';
import { currentVersion, migrate, MigrationError, MIGRATIONS } from './migrations';
import type { Migration } from './migrations';

const describeSql = HAS_NODE_SQLITE ? describe : describe.skip;

const CREATE_CONTACTS: Migration = {
  id: 1,
  name: 'create contacts',
  up: 'CREATE TABLE contacts (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL)',
};

const ADD_PHONE: Migration = {
  id: 2,
  name: 'add phone to contacts',
  up: 'ALTER TABLE contacts ADD COLUMN phone TEXT',
};

describeSql('migrate', () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function tableNames(): Promise<string[]> {
    const rows = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    return rows.map((row) => row.name);
  }

  it('reports version 0 for a fresh database', async () => {
    await expect(currentVersion(db)).resolves.toBe(0);
  });

  it('applies every migration and records the version', async () => {
    await expect(migrate(db, [CREATE_CONTACTS, ADD_PHONE])).resolves.toBe(2);

    await expect(currentVersion(db)).resolves.toBe(2);
    expect(await tableNames()).toContain('contacts');

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(contacts)');
    expect(columns.map((column) => column.name)).toEqual(['id', 'name', 'phone']);
  });

  it('skips migrations that have already run', async () => {
    await migrate(db, [CREATE_CONTACTS]);

    // Re-running the full list must not re-run migration 1, which would throw
    // "table contacts already exists".
    await expect(migrate(db, [CREATE_CONTACTS, ADD_PHONE])).resolves.toBe(2);
    await expect(currentVersion(db)).resolves.toBe(2);
  });

  it('is a no-op when everything has already been applied', async () => {
    await migrate(db, [CREATE_CONTACTS, ADD_PHONE]);
    await expect(migrate(db, [CREATE_CONTACTS, ADD_PHONE])).resolves.toBe(2);
  });

  it('rejects a list that is not numbered contiguously from 1', async () => {
    await expect(migrate(db, [CREATE_CONTACTS, { ...ADD_PHONE, id: 3 }])).rejects.toThrow(
      MigrationError
    );
    await expect(migrate(db, [{ ...CREATE_CONTACTS, id: 0 }])).rejects.toThrow(
      /contiguously from 1/
    );
  });

  it('refuses to run against a database from a newer build', async () => {
    await db.execAsync('PRAGMA user_version = 7');

    await expect(migrate(db, [CREATE_CONTACTS])).rejects.toThrow(/newer version of the app/);
    // Still 7 - it did not quietly downgrade anything.
    await expect(currentVersion(db)).resolves.toBe(7);
  });

  it('rolls a failing migration back and leaves the version alone', async () => {
    const broken: Migration = {
      id: 2,
      name: 'broken',
      up: 'CREATE TABLE good (id TEXT); CREATE TABLE bad (this is not sql)',
    };

    await expect(migrate(db, [CREATE_CONTACTS, broken])).rejects.toThrow(MigrationError);

    await expect(currentVersion(db)).resolves.toBe(1);
    const tables = await tableNames();
    expect(tables).toContain('contacts');
    // The half of the broken migration that was valid must not survive.
    expect(tables).not.toContain('good');
  });

  it('reports which migration failed', async () => {
    const broken: Migration = { id: 1, name: 'broken one', up: 'NOT SQL AT ALL' };
    await expect(migrate(db, [broken])).rejects.toThrow(/Migration 1 \("broken one"\)/);
  });

  it('ships no migrations yet, so the first table belongs to the first feature', async () => {
    // Guards the boundary described in migrations.ts: when this starts failing,
    // it is because a feature added a table, which is the intended way in.
    expect(MIGRATIONS).toHaveLength(0);
    await expect(migrate(db)).resolves.toBe(0);
  });
});
