import { createInMemoryDatabase, HAS_NODE_SQLITE } from '../../../jest/in-memory-sqlite';
import type { InMemoryDatabase } from '../../../jest/in-memory-sqlite';
import { createRepository, ENTRY_COLUMNS_SQL, RepositoryError } from './repository';

// expo-crypto is native. Sequential ids keep assertions readable; uniqueness is
// all the repository asks of them.
// Jest hoists the factory above the file, so anything it closes over has to be
// `mock`-prefixed for the transform to allow it.
let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `uuid-${String(++mockUuidCounter).padStart(3, '0')}`,
  getRandomBytesAsync: async (n: number) => new Uint8Array(n),
}));

// node:sqlite landed in Node 22.5. package.json allows 20.19.4, CI pins 22.x,
// so these run in CI always and locally on a modern Node.
const describeSql = HAS_NODE_SQLITE ? describe : describe.skip;

type Contact = { name: string; relationship: string; phone: string | null };

describeSql('createRepository', () => {
  let db: InMemoryDatabase;
  let contacts: ReturnType<typeof makeRepository>;

  function makeRepository() {
    return createRepository<Contact>(
      { table: 'contacts', fields: ['name', 'relationship', 'phone'] },
      async () => db
    );
  }

  beforeEach(async () => {
    mockUuidCounter = 0;
    db = createInMemoryDatabase();
    await db.execAsync(
      `CREATE TABLE contacts (${ENTRY_COLUMNS_SQL}, name TEXT NOT NULL, relationship TEXT, phone TEXT)`
    );
    contacts = makeRepository();
  });

  afterEach(async () => {
    await db.closeAsync();
    jest.useRealTimers();
  });

  describe('configuration', () => {
    it('rejects a table name that is not a plain identifier', () => {
      expect(() =>
        createRepository<Contact>({ table: 'contacts; DROP TABLE users', fields: ['name'] })
      ).toThrow(RepositoryError);
    });

    it('rejects a column name that is not a plain identifier', () => {
      expect(() =>
        createRepository({ table: 'contacts', fields: ['name = 1 OR 1'] })
      ).toThrow(RepositoryError);
    });

    it('rejects columns the repository manages itself', () => {
      expect(() => createRepository({ table: 'contacts', fields: ['id'] })).toThrow(
        /managed by the repository/
      );
      expect(() => createRepository({ table: 'contacts', fields: ['created_at'] })).toThrow(
        RepositoryError
      );
    });

    it('rejects a repository with no fields', () => {
      expect(() => createRepository({ table: 'contacts', fields: [] })).toThrow(/no fields/);
    });
  });

  describe('create', () => {
    it('stores the entry and returns it with generated metadata', async () => {
      const created = await contacts.create({
        name: 'Alex Reyes',
        relationship: 'Sister',
        phone: '555-0101',
      });

      expect(created).toEqual({
        id: 'uuid-001',
        name: 'Alex Reyes',
        relationship: 'Sister',
        phone: '555-0101',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(created.createdAt).toBe(created.updatedAt);

      await expect(contacts.find('uuid-001')).resolves.toEqual(created);
    });

    it('writes a missing optional field as NULL rather than undefined', async () => {
      const created = await contacts.create({
        name: 'Sam Okafor',
        relationship: 'Neighbour',
      } as Contact);

      const stored = await contacts.find(created.id);
      expect(stored?.phone).toBeNull();
    });

    it('returns exactly what find() reads back', async () => {
      // The two used to disagree: an omitted field was stored as NULL and
      // returned as absent, so a screen rendering `created` saw something the
      // database did not contain.
      const created = await contacts.create({
        name: 'Sam Okafor',
        relationship: 'Neighbour',
      } as Contact);

      await expect(contacts.find(created.id)).resolves.toEqual(created);
    });

    it('does not hand back keys that were never columns', async () => {
      // Undeclared keys are dropped on insert, so echoing them makes the return
      // value look like a saved record when it is not.
      const created = await contacts.create({
        name: 'Sam',
        relationship: 'Friend',
        phone: null,
        nickname: 'Sammy',
      } as never);

      expect(created).not.toHaveProperty('nickname');
    });

    it('treats SQL in a value as text, not as SQL', async () => {
      const created = await contacts.create({
        name: "Robert'); DROP TABLE contacts;--",
        relationship: 'Friend',
        phone: null,
      });

      const stored = await contacts.find(created.id);
      expect(stored?.name).toBe("Robert'); DROP TABLE contacts;--");
      // The table is still there, which is the actual assertion.
      await expect(contacts.list()).resolves.toHaveLength(1);
    });
  });

  describe('list', () => {
    it('returns an empty array when there is nothing stored', async () => {
      await expect(contacts.list()).resolves.toEqual([]);
    });

    it('orders by creation time, oldest first', async () => {
      // Inserted directly so the timestamps are controlled rather than racing
      // inside the same millisecond.
      for (const [id, createdAt, name] of [
        ['c', '2026-03-01T10:00:00.000Z', 'Third'],
        ['a', '2026-01-01T10:00:00.000Z', 'First'],
        ['b', '2026-02-01T10:00:00.000Z', 'Second'],
      ]) {
        await db.runAsync(
          'INSERT INTO contacts (id, created_at, updated_at, name) VALUES (?, ?, ?, ?)',
          [id, createdAt, createdAt, name]
        );
      }

      const listed = await contacts.list();
      expect(listed.map((entry) => entry.name)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('find', () => {
    it('returns null for an id that is not there', async () => {
      await expect(contacts.find('nope')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('changes only the fields it is given and bumps updatedAt', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-01T09:00:00.000Z'));
      const created = await contacts.create({
        name: 'Alex Reyes',
        relationship: 'Sister',
        phone: '555-0101',
      });

      jest.setSystemTime(new Date('2026-05-02T09:00:00.000Z'));
      const updated = await contacts.update(created.id, { phone: '555-0199' });

      expect(updated.phone).toBe('555-0199');
      expect(updated.name).toBe('Alex Reyes');
      expect(updated.relationship).toBe('Sister');
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).toBe('2026-05-02T09:00:00.000Z');
    });

    it('leaves updatedAt alone when nothing actually changed', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-01T09:00:00.000Z'));
      const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });

      jest.setSystemTime(new Date('2026-05-02T09:00:00.000Z'));
      const updated = await contacts.update(created.id, {});

      expect(updated.updatedAt).toBe(created.updatedAt);
    });

    it('can clear a field by setting it to null', async () => {
      const created = await contacts.create({
        name: 'Alex',
        relationship: 'Sister',
        phone: '555-0101',
      });
      const updated = await contacts.update(created.id, { phone: null });
      expect(updated.phone).toBeNull();
    });

    it('throws for an id that is not there', async () => {
      await expect(contacts.update('nope', { name: 'X' })).rejects.toThrow(RepositoryError);
    });

    it('still works when pulled off the repository', async () => {
      // `const { update } = repo` and `onPress={repo.update}` are both ordinary
      // React. While update reached its sibling through `this`, both threw
      // TypeError at runtime, and TypeScript had nothing to say about it.
      const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });
      const { update } = contacts;

      await expect(update(created.id, { name: 'Alexis' })).resolves.toMatchObject({
        name: 'Alexis',
      });
    });

    it('still works detached on the no-op path, which reads a row back too', async () => {
      const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });
      const { update } = contacts;

      await expect(update(created.id, {})).resolves.toMatchObject({ name: 'Alex' });
    });
  });

  describe('remove', () => {
    it('deletes the entry', async () => {
      const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });
      await contacts.remove(created.id);

      await expect(contacts.find(created.id)).resolves.toBeNull();
      await expect(contacts.list()).resolves.toEqual([]);
    });

    it('throws for an id that is not there', async () => {
      await expect(contacts.remove('nope')).rejects.toThrow(RepositoryError);
    });

    it('leaves other entries alone', async () => {
      const first = await contacts.create({ name: 'One', relationship: 'A', phone: null });
      await contacts.create({ name: 'Two', relationship: 'B', phone: null });

      await contacts.remove(first.id);

      const remaining = await contacts.list();
      expect(remaining.map((entry) => entry.name)).toEqual(['Two']);
    });
  });
});
