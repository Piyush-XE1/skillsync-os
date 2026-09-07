# SkillSync backup system

One backup system, one screen, four real cloud targets. This document is the
reference for how it works; if something here disagrees with the code, the code
wins and this file is wrong — fix it.

```
src/lib/backup/advanced-backup.ts   format, crypto, compression, checksum, health  (no DOM)
src/lib/backup/vault.ts             durable copies on the device        (IndexedDB)
src/lib/backup/cloud.ts             GitHub Gist · WebDAV · Google Drive · Dropbox
src/store/useBackupStore.ts         the only state the UI reads, + the auto scheduler
src/components/profile/BackupSection.tsx   the screen
src/components/profile/CloudPanel.tsx      provider rows + setup guides + file browser
```

`src/lib/backup/index.ts` re-exports all of it, so callers import from
`@/lib/backup` and never reach into a module directly.

## The screen

Profile → **Backup & Restore** (`/profile/backup`), in this order:

1. **Status** — when the last copy was taken, how big it is, `Back up now` and
   `Restore`. Errors and the `Undo that restore` action live here too.
2. **Options for the next backup** — compress / only-what-changed / encrypt
   with a password. Collapsed by default; the password fields only appear when
   encryption is on.
3. **On this device** — the vault: every copy this browser holds, with
   `Restore`, `Save as file` and `Delete` per row, plus `Verify newest`,
   `Activity` and `Remove all copies`.
4. **Cloud copies** — the four providers, each with a real status line, a setup
   guide, `Upload`, an auto-upload switch and a file browser.
5. **Automatic copies** — one switch, an interval (6 h / Daily / 2 days /
   Weekly), how many rolling copies to keep, and `Run now`.
6. **Reset SkillSync** — wipes the workspace, never the backup files.

There is intentionally no tab bar, no "advanced" sub-screen and no second
backup implementation.

## File format

A backup is one JSON envelope. Version **4** writes it; versions 1–3 still
restore (`MIN_BACKUP_VERSION = 1`).

```jsonc
{
  "kind": "skillsync-backup",
  "backupVersion": 4,
  "appVersion": "3.6.0",
  "backupId": "ZgmyFD5pLD3",
  "createdAt": "2026-09-07T09:12:44.318Z",
  "data": { "schemaVersion": 1, "roadmaps": [], "...": "the whole AppData" },
  "checksum": "9f3c…", // over canonicalStringify(data)
  "algorithm": "AES-256-GCM", // only when encrypted
  "compressed": true, // payload was gzipped
  "compressionInfo": { "algorithm": "gzip", "originalSize": 183442 },
  "encryptionInfo": {
    "algorithm": "AES-256-GCM",
    "kdf": "PBKDF2-SHA256",
    "salt": "base64",
    "iv": "base64",
    "iterations": 120000,
  },
  "incremental": false, // diff-only backup
  "baseBackupId": null,
}
```

Rules worth knowing:

- **Only `data` is compressed and encrypted.** The envelope around it stays
  readable so the app can tell a SkillSync file from a random `.json`, report
  its size, and ask for the right password before doing any work. `data` then
  holds either the real object, the compressed string, or the
  `enc:v1:base64(iv‖ciphertext‖tag)` string.
- **Write order** is compress → encrypt → wrap; **read order** is unwrap →
  decrypt → decompress → parse → checksum. Anything that writes out of order
  produces files that used to fail on restore — there is a test for this.
- Compression uses the platform `CompressionStream` (gzip) and is only applied
  above `COMPRESSION_THRESHOLD` (96 KB) and only if it actually shrinks the
  payload. No `CompressionStream`? The file is written plain.
- Encryption is AES-256-GCM with a PBKDF2-SHA256 key (120 000 iterations,
  per-file salt). There is **no recovery path**: lose the password, lose the
  file. The UI says so twice.
- `checksum` is SHA-256 over a key-sorted canonical rendering of `data`, so
  re-serialising the same content gives the same hash. Without `crypto.subtle`
  it degrades to an `fnv1a:` prefix — still a tamper check, not a security one.
- File name: `SkillSync-Backup-<YYYYMMDD-HH>-<first 6 of id>.json`.

## The vault (`vault.ts`)

IndexedDB database `skillsync-vault` (version 1) with two stores:

| store     | key   | holds                                                      |
| --------- | ----- | ---------------------------------------------------------- |
| `records` | `id`  | `{ id, …summary, text, meta }` — the payloads              |
| `kv`      | `key` | cloud tokens and small side-car values (never in a backup) |

- Listing hands out **summaries only** (kind, label, size, record counts,
  flags, cloud marker, `createdAt`), so the screen never parses payloads.
- Kinds: `manual`, `auto` (rolling), `safety` (taken just before a restore),
  `cloud` (a copy pulled down). Only `auto` is ever pruned.
- If IndexedDB is missing, blocked, or the window is a private-mode one, the
  vault **degrades to an in-memory map** and the screen says so in plain
  language: never a silent lie about durability, and never a fallback to
  `localStorage` (payloads there are what made the old version lag).
- `migrateLegacyLocalStorageBackups()` picks up payloads left behind by the
  previous storage layout, files them in the vault and frees the quota.

## Restore

Staged on purpose, because it destroys data:

1. `stageRestore()` decodes and validates, and shows **what is inside**
   (counts, age, size, warnings for newer app versions or a missing base
   backup). Encrypted files stop here with a password field.
2. Confirm sheet, which explains the replacement.
3. `confirmRestore()` writes a `safety` snapshot of the _current_ workspace
   first, then applies the backup via `importJSON`. `Undo that restore` puts
   the snapshot back immediately and consumes it — no second confirmation loop.

Incremental files resolve against their base when it is in the vault; if it is
not, the restore stops with an explanation instead of applying half a
workspace.

## Automatic copies

One timer for the whole app, started by `<BackupRunner />` (mounted in the root
route) after the app store has rehydrated — never during first paint.

- Every 60 s it asks `isAutoBackupDue()` (interval + "did anything change
  since the last copy"), and only writes when the tab is visible. Work is
  pushed through `requestIdleCallback` so a save never lands mid-typing.
- Turning the switch on takes one copy straight away, so the promise is
  immediately true.
- `backupOnChanges` is deliberately coarse: 10 minutes of quiet after a burst
  of edits, not a write per keystroke.
- After each auto copy, `pruneVaultKind("auto", keep)` trims to the newest N.
  Manual backups never prune; a bug that did was the reason copies vanished.
- If the provider has auto-upload on, the copy is pushed after it is filed
  locally (fire-and-forget, so a slow network cannot block `Back up now`).

## Cloud providers

All four speak HTTP directly from the browser — no SkillSync server exists.
Each request is bounded by a 45 s `AbortController`, and every failure is
translated into a sentence naming the thing to change. Tokens live in the vault
`kv` store; they are never written into a backup file.

| provider     | what you need                                                                      | size limit  |
| ------------ | ---------------------------------------------------------------------------------- | ----------- |
| GitHub Gist  | a classic PAT with only the `gist` scope                                           | 6 MB/file   |
| WebDAV       | folder URL + username + password (or app token, or bearer token)                   | server-side |
| Google Drive | a _Web application_ OAuth client id whose JS origins include this site             | 30 MB/file  |
| Dropbox      | an app key with PKCE enabled and this origin + `/profile/backup` as a redirect URI | 150 MB/file |

### GitHub Gist

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Tokens (classic)**.
2. Generate a token with the single `gist` scope, no expiry if you want it to
   keep working unattended.
3. Profile → Cloud copies → GitHub Gist → **Set up**, paste it, **Save &
   connect**. Each backup becomes its own _private_ gist named
   `SkillSync-Backup-<date>-<id>.json`; pressing Upload again on the same copy
   updates that gist instead of leaving a duplicate, and a gist deleted on
   GitHub is quietly recreated.
4. Gist contents are private, not secret: keep the password option on for
   anything you would not want GitHub to read.

### WebDAV

1. Point SkillSync at a folder: Nextcloud
   `https://host/remote.php/dav/files/<user>/SkillSync`, Synology
   `https://host:5006/dav/SkillSync`, ownCloud `/remote.php/webdav/SkillSync`.
   The folder is created with `MKCOL` if missing.
2. Use an **app password** where the server supports it.
3. The server must send CORS headers for the origin SkillSync is served from —
   `PROPFIND, PUT, GET, DELETE, MKCOL, OPTIONS` in `Allow-Methods` and
   `Authorization, Depth, Content-Type` in `Allow-Headers`. On Nextcloud that is
   usually handled; behind your own nginx you add them. This is the number one
   WebDAV failure and it is the browser refusing, not SkillSync.
4. `http://` only works from an `http://` origin — mixed content is blocked.

### Google Drive

1. console.cloud.google.com → APIs & Services → enable **Google Drive API**.
2. OAuth consent screen → External → add the scope
   `https://www.googleapis.com/auth/drive.file` → publish (test mode drops the
   token after a week).
3. Credentials → Create credentials → **OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins** add the exact origin you open
   SkillSync on, port included (e.g. `http://localhost:5173`).
5. Paste the client id in the setup sheet and press **Connect with Google**.
   Google's own library mints the token in the page, so no client secret is
   stored anywhere. Backups go to a `SkillSync Backups` folder.
6. Access tokens expire after about an hour; the next action re-prompts.

### Dropbox

1. dropbox.com/developers/apps → **Create app** → scoped access →
   _App folder_ (recommended) → name it.
2. In the app's **OAuth** tab enable **PKCE** so no app secret is required, and
   add `<your origin>/profile/backup` to **Redirect URIs**.
3. Paste the app key and press **Connect with Dropbox**. You land back on this
   page with `?code=…`, which the app exchanges and scrubs from the address
   bar.
4. Short-lived access tokens work too, for testing only: Dropbox access tokens
   live ~4 hours, so a pasted token will need replacing unless it came from the
   connect flow (which stores a refresh token and renews silently).

### How a provider behaves

- `Test connection` verifies credentials without uploading anything.
- `Upload` pushes the newest vault copy; the row then shows which remote file
  it maps to, and `Restore` pulls a listed file back down through the same
  staged review flow as a local file.
- Listing is cached per provider until you refresh it, so opening the panel
  never fans out four network calls.

## Deliberately absent

- **No service worker, no IndexedDB "queue", no background sync** — a browser
  tab cannot promise them anyway, and pretending produced the old
  half-working states.
- **No payloads in `localStorage`.** Only settings and the metadata of the last
  backup live there (a few hundred bytes), which is what keeps the app's own
  quota free.
- **No auto-merge of two diverged workspaces.** A restore replaces; the safety
  snapshot makes it reversible. Conflict resolution strategies exist in the
  config type for a future sync engine, and nothing pretends to implement them.
- **Cloud tokens are never in a backup file**, so a file can be shared without
  leaking credentials.

## Testing

```bash
npx vitest run src/lib/backup     # format, crypto, vault, providers (95 tests)
npx vitest run src/store/useBackupStore.test.ts
npx vitest run src/components/profile/BackupSection.test.tsx
npx vitest run src/routes/profile.backup.render.test.tsx
npx tsc --noEmit && npx eslint src --max-warnings 0
```

The render tests mount the real components (React 19's `act`), drive the buttons
by their visible labels, and assert the vault afterwards — so "the option
exists but nothing happens" cannot come back quietly.

## Programmatic use

```ts
import {
  createAdvancedBackup,
  validateAdvancedBackup,
  restoreAdvancedBackup,
  analyzeBackupHealth,
} from "@/lib/backup";

const made = await createAdvancedBackup(data, {
  compression: true,
  incremental: false,
  password: "optional",
});
const ok = await validateAdvancedBackup(made.text); // → ValidBackup | error
const restored = await restoreAdvancedBackup(ok.backup, {}); // → AppData, migrated
const health = await analyzeBackupHealth(made.text); // reads metadata only
```

UI code should go through `useBackupStore` instead — it is what keeps the vault,
health, activity log and cloud state consistent with the files on disk.
