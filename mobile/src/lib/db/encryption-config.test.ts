// Encryption is two lines of app.json, and nothing else in this suite reads
// them.
//
// Everything else about the journal database is testable here: key generation,
// the PRAGMA, the migrations. What is not is whether the binary those run
// against was built with SQLCipher at all - that comes from a config plugin,
// applied at prebuild, on a machine no test touches. Delete `useSQLCipher` and
// expo-sqlite links stock SQLite, `PRAGMA key` is silently ignored (see the
// probe in database.ts and issue #130), and every journal in the field is
// written in the clear. Nothing goes red.
//
// So this reads the config file itself. It is a weak test of a strong claim -
// it proves the intent is still declared, not that a build honoured it, which
// is issue #101 on hardware - but it is the difference between that regression
// being caught in CI and being caught by a user.

import appJson from '../../../app.json';

/** Only the shape this file asserts on; app.json holds a great deal more. */
type AppConfig = {
  expo: {
    plugins: (string | [string, Record<string, unknown>?])[];
  };
};

const config = appJson as unknown as AppConfig;

function pluginEntry(name: string) {
  return config.expo.plugins.find((entry) =>
    typeof entry === 'string' ? entry === name : entry[0] === name
  );
}

describe('app.json', () => {
  it('builds expo-sqlite with SQLCipher', () => {
    // Without this the journal is a plaintext SQLite file and 0015, 0003 and
    // the local-only promise in 0001 all quietly stop being true.
    const entry = pluginEntry('expo-sqlite');

    expect(Array.isArray(entry)).toBe(true);
    expect((entry as [string, Record<string, unknown>])[1]).toMatchObject({
      useSQLCipher: true,
    });
  });

  it('keeps the expo-secure-store plugin entry, which is not just registration', () => {
    // key.ts protects the key with WHEN_UNLOCKED_THIS_DEVICE_ONLY, and that
    // option is iOS-only. On Android the equivalent - keeping the key out of
    // Auto Backup, so a restored backup on a new phone cannot decrypt a copied
    // database file - comes entirely from this plugin's backup rules. It looks
    // like a redundant line in a plugin list and it is load-bearing.
    expect(config.expo.plugins).toContain('expo-secure-store');
  });
});
