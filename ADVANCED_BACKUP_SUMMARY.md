# Backup system — what was rebuilt, and what is left for you

This file is the record of one pass over the backup feature: what "advanced
backup & restore" used to be, what it is now, the specific bugs that were
killed, and the handful of steps only a person with accounts can do.
How the system works day to day is in [`BACKUP_SYSTEM.md`](./BACKUP_SYSTEM.md).

## Why this existed at all

The feature had grown two implementations side by side: the original
`backup-legacy.ts` (pretty-printed full payloads into `localStorage` on a
debounce) and an "advanced" system whose options were visible but whose screens
and cloud calls were never wired up. The consequences were exactly the three
complaints it was built to answer:

- **Inaccessible** — cloud backup, scheduled copies, health checks and the
  version history existed as code, buttons and dead tabs; nothing reached them.
- **Laggy** — every mutation re-serialised up to three whole workspaces,
  pretty-printed, into a 5 MB `localStorage` budget shared with the app itself,
  1.5 seconds after each edit. On a large workspace that is a long synchronous
  string build on the main thread, in an area already busy rendering.
- **Confusing** — two screens, four tabs, jargon ("MAX LEVEL", "queue",
  "conflict resolution"), and statuses that could not be true.

## What replaced it

| area             | now                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| format           | one envelope, `backupVersion: 4`, readable metadata, payload-only compression + encryption     |
| durable copies   | IndexedDB vault `skillsync-vault`; `localStorage` holds settings and last-backup metadata only |
| state            | a single zustand store (`useBackupStore`) that the screen reads with selectors                 |
| restore          | staged: review → confirm, with a mandatory pre-restore snapshot and one-tap undo               |
| scheduled copies | one scheduler (`<BackupRunner />`) ticking once a minute while visible                         |
| cloud            | four real HTTP providers, each with its setup guide rendered in the app                        |
| UI               | one screen, one accordion of options, everything else a sheet                                  |

Deleted, not deprecated: `src/lib/backup-legacy.ts`, `src/lib/backup.test.ts`,
`src/lib/backup.storage.test.ts`, `src/hooks/use-advanced-backup.ts`,
`src/lib/backup/cloud-backup.ts`, `src/lib/backup/backup-storage.ts`,
`src/components/profile/BackupSection.advanced.tsx`. Anything that imported
them now imports from `@/lib/backup`.

## Bugs found and fixed in this pass

1. **Encrypted backups could not be restored.** The v3 writer encrypted the
   whole envelope and then validated the decrypted _envelope_ as if it were
   `data`. Encryption now applies to the payload string only, and the read path
   is strictly unwrap → decrypt → decompress → parse → checksum.
2. **A compressed round trip failed on restore** — the same ordering problem in
   miniature; `gz:` payloads inside an encrypted envelope were decompressed
   before decryption. There is a test named after the failure.
3. **Every manual backup deleted the rolling copies.** The prune call in
   `create()` ran with a keep-count of 1 for _all_ kinds, so pressing "Back up
   now" wiped the auto history. Pruning now happens only for `kind: "auto"`.
4. **Dropbox sign-in could never complete.** Two separate bugs: the PKCE
   challenge was hashed from a _different_ random verifier than the one sent to
   the token endpoint, and the token exchange posted to
   `api.dropboxapi.com/1/oauth2/token` (the API host) instead of
   `api.dropbox.com`. Both fixed, plus an expiry check that refreshes the
   access token silently — before that, a connection died four hours after you
   set it up and every later sync failed with an unusable 401.
5. **`Undo that restore` did not undo.** It routed through the normal restore
   flow, so it opened a review dialog and left the workspace as it was. Undo is
   now immediate and consumes the snapshot.
6. **Gist uploads piled up duplicates.** Pressing Upload twice created a second
   gist, and the `fileId` the vault had recorded was dropped on the floor.
   Re-uploading the same copy now PATCHes its gist, and a gist deleted on GitHub
   falls back to creating a new one.
7. **The lag.** The 1.5 s debounced `localStorage` snapshot loop is gone;
   snapshots go to the vault, throttled by `isAutoBackupDue()`, scheduled
   through `requestIdleCallback`, and only while the tab is visible.
8. **Two systems disagreeing about status.** Everything (screen, status line,
   notifications, profile summary) now derives from `useBackupStore`, and the
   health check reads backup _metadata_ rather than parsing payloads — it used
   to hash whole files on a timer, which is how a settings screen got janky.
9. `formatRelative(30s)` said "1 min ago"; `Chip tone="primary"` was not a
   tone; `haptics.light()` did not exist. Small, but each one was a visible lie.

## Tests added

`src/lib/backup/envelope.test.ts`, `vault.test.ts`, `vault.legacy.test.ts`,
`cloud.test.ts`, `src/store/useBackupStore.test.ts`,
`src/components/profile/BackupSection.test.tsx`,
`src/routes/profile.backup.render.test.tsx` — 124 tests around the backup
system, covering the envelope (including the two failure modes above), the vault
with and without IndexedDB, the exact HTTP request each provider must make, the
store loop (create → vault → restore → undo → auto schedule → cloud glue) and
the screen driven by its visible labels.

`npx vitest run` → 371 passing (44 files). `npx tsc --noEmit` and `npx eslint src
--max-warnings 0`: clean (six pre-existing `react-refresh` warnings in files
outside this feature remain).

## What only you can do

Everything works offline, from the file, and against the two providers that
need no registration. The OAuth providers need an app in _your_ account — the
sandbox cannot create it, and pasting a token into your repo would be the wrong
fix.

1. **GitHub (simplest)** — create a classic PAT with only the `gist` scope at
   github.com → Settings → Developer settings → Personal access tokens, then
   paste it into Profile → Cloud copies → GitHub Gist → Set up.
2. **Any WebDAV share** — Nextcloud/ownCloud/Synology folder URL, username and
   an app password. Make sure the server's CORS allows this origin with
   `PROPFIND, PUT, GET, DELETE, MKCOL, OPTIONS`.
3. **Google Drive** — a _Web application_ OAuth client in
   console.cloud.google.com with the Drive API enabled, the `drive.file` scope
   and your exact origin (including port) under Authorized JavaScript origins.
   Paste the client id; the token is minted in the page, so no secret.
4. **Dropbox** — an app at dropbox.com/developers/apps with **PKCE enabled** and
   `<origin>/profile/backup` registered as a redirect URI. Paste the app key.
5. **On a phone/tablet build** — the native shell cannot be produced here. Run
   `npm run build:mobile && bunx cap sync android` locally, and remember the
   vault is the browser/webview's IndexedDB: clearing app storage clears local
   copies, which is exactly what the cloud providers are for.

After any of those: press **Test connection** in the same sheet. If it fails,
the sentence under the field names the setting to change — that is the whole
point of translating API errors instead of showing them.
