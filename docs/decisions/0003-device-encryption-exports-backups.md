# 0003 — Device-level encryption for exports, backups, and OS auto-backup

**Status:** Decided; implementation not yet built
**Resolves:** GitHub issue "Research local device encryption for exports and backups"
**Scope note:** this is distinct from the local-database-encryption decision (SQLCipher + biometric unlock, tracked in `architecture-plan.md`), which protects data at rest inside the app. This record covers what happens once data leaves that encrypted store — export, print, email, or backup. Encrypting the database does not automatically protect a PDF, backup file, or printout generated from it.

## Risk 1 — OS-level backups may copy our data to the cloud without an explicit feature doing it

Both iOS and Android back up an app's local files by default (iCloud Backup / Google Auto Backup) — no explicit upload action required. This quietly contradicts "no cloud storage of medical data in MVP" even though we never built a cloud feature.

**Decision:** exclude our data directory from OS auto-backup outright, regardless of the export feature.

- **iOS:** flag files/directories with `NSURLIsExcludedFromBackupKey` to opt out of iCloud/iTunes backup.
- **Android:** `android:allowBackup="false"` opts the whole app out, or a `backup_rules.xml` can exclude specific paths for more granularity.

This is a small config change that makes our "local-only" claim actually true rather than true-in-spirit. Should be done early, independent of any export/backup feature timeline.

## Risk 2 — should a user-initiated backup/restore file (moving to a new phone) be encrypted?

If/when a "back up my journal" / "restore on new phone" feature is built: technically straightforward with `expo-crypto` (AES-256). The hard part isn't the encryption, it's the passphrase — someone has to remember it, or we store a recoverable key somewhere, which just relocates the security problem. "You forgot your passphrase, your journal is now permanently unreadable" is a real support burden for this audience.

**Decision:** if this feature is built, encrypt the file, but scope it as direct device-to-device transfer (AirDrop, Files app, direct share) rather than something meant to be emailed or stored elsewhere. Treat a forgotten passphrase as an accepted, clearly-communicated risk rather than something to engineer around (e.g. no "recover my passphrase" flow).

## Risk 3 — should the PDF export ([0002](0002-pdf-export-legal-privacy.md)) be password-protected?

AES-256 PDF password protection is genuinely strong when implemented correctly. But: it's only as strong as the password (weak passwords are crackable in seconds), some PDF viewers don't enforce permission restrictions uniformly, and — the real issue for us — sharing a password means a *second* channel to communicate it securely, which adds a step for an exhausted caregiver without eliminating the core interception/misdelivery risk.

**Decision:** don't make PDF password protection default or required. Keep it optional for users who want the extra step, with a one-line explanation of the tradeoff. Primary mitigation for print/email export stays what's in [0002](0002-pdf-export-legal-privacy.md): the pre-export warning, no pre-filled recipients, metadata stripping.

## Summary

| What | Decision |
|---|---|
| OS auto-backup (iCloud/Google) of app data | Exclude entirely — do this regardless of other export work |
| Device-transfer backup/restore file | Encrypt (AES-256), device-to-device only, forgotten passphrase = accepted unrecoverable risk |
| PDF export password protection | Optional, not default — passphrase-sharing problem outweighs the benefit for this audience |

Worth a second pair of eyes from someone with mobile security experience before locking in the backup-file encryption implementation.
