// The guard in in-memory-sqlite.ts only earns its place if it actually runs on
// a Node without node:sqlite. It did not: a static `import ... from
// 'node:sqlite'` is resolved before any module code, so the two SQLite-backed
// suites errored out on Node below 22.5 instead of skipping - issue #133, on a
// version `engines` still permits.
//
// CI runs 22.x, so nothing here would notice a regression. Making the require
// throw is the only way to test the old-Node path from a new Node.

// doMock registrations live for the whole file, so each test states which world
// it wants rather than inheriting the previous one's.
beforeEach(() => {
  jest.resetModules();
  jest.dontMock('node:sqlite');
});

function withoutNodeSqlite() {
  jest.doMock('node:sqlite', () => {
    throw new Error('No such built-in module: node:sqlite');
  });
}

describe('on a Node without node:sqlite', () => {
  it('reports the feature as missing rather than throwing at import', () => {
    withoutNodeSqlite();

    // The import itself is the assertion: before the fix it threw here.
    const { HAS_NODE_SQLITE } = require('./in-memory-sqlite');

    expect(HAS_NODE_SQLITE).toBe(false);
  });

  it('refuses to build a database, and says which Node it needs', () => {
    withoutNodeSqlite();

    const { createInMemoryDatabase } = require('./in-memory-sqlite');

    expect(() => createInMemoryDatabase()).toThrow(/Node 22.5 or newer/);
  });
});

describe('on a Node that has it', () => {
  it('reports the feature as present and builds a working database', async () => {
    const { HAS_NODE_SQLITE, createInMemoryDatabase } = require('./in-memory-sqlite');

    expect(HAS_NODE_SQLITE).toBe(true);

    const db = createInMemoryDatabase();
    try {
      await db.execAsync('CREATE TABLE t (id TEXT)');
      await db.runAsync('INSERT INTO t (id) VALUES (?)', 'a');
      await expect(db.getFirstAsync('SELECT id FROM t')).resolves.toEqual({ id: 'a' });
    } finally {
      await db.closeAsync();
    }
  });
});
