// The two ways this layer used to give a wrong answer without an error.
//
// Kept separate from repository.test.ts, which covers what the repository does
// when it is used correctly. Everything here is about what it does when it is
// not - and in both cases the old behaviour was to carry on and report success.

import { createInMemoryDatabase, HAS_NODE_SQLITE } from '../../../jest/in-memory-sqlite';
import type { InMemoryDatabase } from '../../../jest/in-memory-sqlite';
import { createRepository, ENTRY_COLUMNS_SQL, RepositoryError } from './repository';

let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `uuid-${String(++mockUuidCounter).padStart(3, '0')}`,
  getRandomBytesAsync: async (n: number) => new Uint8Array(n),
}));

const describeSql = HAS_NODE_SQLITE ? describe : describe.skip;

type Contact = { name: string; relationship: string; phone: string | null };

describe('a field that collides with the metadata', () => {
  // `selection` aliases created_at to createdAt, so a field of that name gives
  // the SELECT two output columns called createdAt. SQLite returns the last
  // one, which means the entry's createdAt would quietly be the feature's
  // column and the real timestamp would never reach a caller. Only the
  // snake_case spellings used to be reserved, so this passed configuration.
  it('is rejected under the camelCase name the selection emits', () => {
    expect(() => createRepository({ table: 'contacts', fields: ['createdAt'] })).toThrow(
      /managed by the repository/
    );
    expect(() => createRepository({ table: 'contacts', fields: ['updatedAt'] })).toThrow(
      RepositoryError
    );
  });

  it('is rejected whatever the case, because SQLite ignores case in a column name', () => {
    expect(() => createRepository({ table: 'contacts', fields: ['ID'] })).toThrow(RepositoryError);
    expect(() => createRepository({ table: 'contacts', fields: ['Created_At'] })).toThrow(
      RepositoryError
    );
    expect(() => createRepository({ table: 'contacts', fields: ['CreatedAt'] })).toThrow(
      RepositoryError
    );
  });

  it('still allows a name that merely starts the same way', () => {
    expect(() =>
      createRepository({ table: 'contacts', fields: ['created_at_source', 'identifier'] })
    ).not.toThrow();
  });
});

describe('update with a key that is not a column', () => {
  it('refuses before it even opens the database', async () => {
    // The old path filtered the key out, found nothing left to write, read the
    // row back and returned it - a successful-looking edit that saved nothing.
    const contacts = createRepository<Contact>(
      { table: 'contacts', fields: ['name', 'relationship', 'phone'] },
      async () => {
        throw new Error('the database should not have been opened');
      }
    );

    await expect(contacts.update('uuid-001', { nickname: 'Sammy' } as never)).rejects.toThrow(
      RepositoryError
    );
  });
});

describeSql('update with a key that is not a column, against real SQLite', () => {
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
  });

  it('names the key it did not recognise', async () => {
    const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });

    await expect(contacts.update(created.id, { nickname: 'Al' } as never)).rejects.toThrow(
      /Unknown column on "contacts": "nickname"/
    );
  });

  it('applies none of the call, not just the part it understood', async () => {
    // A typo alongside a real field used to write the real one and drop the
    // typo, leaving a row that is half of what the caller asked for.
    const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });

    await expect(
      contacts.update(created.id, { name: 'Alexis', nickname: 'Al' } as never)
    ).rejects.toThrow(RepositoryError);

    await expect(contacts.find(created.id)).resolves.toMatchObject({ name: 'Alex' });
  });

  it('still treats an empty change set as a legitimate no-op', async () => {
    // The distinction that matters: asking for nothing is fine, asking for
    // something that does not exist is not.
    const created = await contacts.create({ name: 'Alex', relationship: 'Sister', phone: null });

    await expect(contacts.update(created.id, {})).resolves.toEqual(created);
  });
});
