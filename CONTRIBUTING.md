# Contributing to SkillSync OS

Thanks for your interest in improving SkillSync OS! This guide explains how the
project is put together and how to make safe, reviewable changes.

---

## What this project is

SkillSync OS is a **local-first** personal productivity app. Everything the user
creates — roadmaps, notes, projects, planner tasks, habits, attendance, expenses,
notifications — lives in the browser's `localStorage` (or the native Android
WebView) and never leaves the device unless the user explicitly exports a backup.

Because the whole product lives in one place, the most important thing to get
right is **not breaking user data**. Small, careful, well-tested changes win.

## Tech stack

- **React 19 + TypeScript**
- **TanStack Router / TanStack Start** (file-based routing)
- **Tailwind CSS v4** (design tokens live in `src/styles.css`)
- **Zustand** (state + persistence)
- **Zod** (validation of persisted data, backups, imports)
- **Vitest** (unit tests)
- **Capacitor** (Android shell)

The package manager is **Bun** (`bun install`, `bun run <script>`), and CI uses
`bun install --frozen-lockfile`, so **always keep `bun.lock` in sync** with
`package.json` when you add a dependency.

## Getting started

```bash
npm install          # or: bun install
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest run
npm run build        # production build
```

The same commands drive the CI workflow (`.github/workflows/ci.yml`), which runs
typecheck → lint → tests → build on every push to `main` and every pull request.

---

## Where things live

```
src/
  routes/               File-based routes (one file per screen)
  components/           Reusable UI (layout, edit sheets, buttons, fields, backgrounds)
  hooks/                React hooks (theme, breakpoints, haptics, keyboard inset, notifications)
  store/useAppStore.ts  The single Zustand store + all mutations
  lib/
    schema.ts           Zod schemas + types for every persisted record + CURRENT_SCHEMA_VERSION
    seed.ts             Default / first-run data
    migrations.ts       Forward-only schema migrations (v1 → CURRENT_SCHEMA_VERSION)
    progress.ts         Pure progress/percentage calculation from checklist "leaves"
    date.ts             Tiny, dependency-free date helpers
    backup.ts           Backup envelope, validation, summary, auto-snapshots
    notifications/      Rule engine, types, delivery adapters, service worker
    native/bridge.ts    Runtime-only bridge to the Android Capacitor plugin
    roadmap-import.ts   Import a roadmap from a JSON file
    url.ts              Safe href helpers (blocks javascript:/data: URLs)
```

### The data model

Persisted state is validated by `AppDataSchema` in `src/lib/schema.ts`, which is
read by the store and by every backup/import. **Any change to the persisted shape
must be a schema migration** (bump `CURRENT_SCHEMA_VERSION`, add a migrator in
`src/lib/migrations.ts`, and update `version` in the store's persist config).

The icon: never mutate a Zod schema's defaults in place to "fix" a bug in user
data. Use a migration or a normalizing step instead, so old data upgrades cleanly.

### Notifications

The notification engine (`src/lib/notifications/engine.ts`) is a **pure function**
that returns the notifications that "should exist right now" for a given app
state + time. Delivery is idempotent via `sourceId`, so running it repeatedly
never duplicates. Keep rules pure and deterministic — they're unit tested.

---

## Testing

Tests run with **Vitest** and live next to the code (`src/**/*.test.ts`). Most
tests run in Node; anything touching `window`/`localStorage` (e.g. the store) uses
jsdom via a `// @vitest-environment jsdom` comment.

```bash
npm run test          # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

**Please add or update a test with any change to domain/rule logic.** The rule
engine, migrations, backup/restore, progress calculation, roadmap import, and the
store are already covered — extend those files rather than creating parallel
test setups.

### Writing a migration test

Construct a fixture for the _old_ shape, call `migrate(fixture)`, and assert the
result is a valid `AppData` at `CURRENT_SCHEMA_VERSION` with the fields you expect.
Never assume the migrator runs in object-key order — it is keyed by the _from_
version.

## Lint & format

```bash
npm run lint   # eslint (with prettier rules)
npm run format # prettier --write .
```

Prettier config lives in `.prettierrc`; the lockfile and generated files are
ignored via `.prettierignore`. CI treats lint as a hard gate, so run it before
pushing.

---

## Making a change

1. Create a branch off `main`:
   `git checkout -b feat/your-change`
2. Make a focused, reviewable change. Prefer several small commits over one
   giant one.
3. Run `npm run typecheck && npm run lint && npm run test && npm run build`
   and make them pass.
4. Commit with a descriptive message:
   `git commit -m "feat(planner): add recurring tasks"`
5. Push and open a pull request. CI will run automatically.

### Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): add ...`
- `fix(scope): resolve ...`
- `refactor(scope): ...`
- `test(scope): ...`
- `docs: ...`

## Android & the native bridge

The Android app is built by `.github/workflows/android.yml` from a tagged
release. Web code talks to the device through the runtime-only
`src/lib/native/bridge.ts` — it never imports Capacitor at module load, so the
web bundle stays clean. When adding a native feature, extend the bridge and the
matching Android plugin, and keep every call defensive (the web fallback must
stay functional).

## Code of conduct

Be kind, be specific, and keep the user's data safe. If a change is risky for
local-first data, call it out in the PR description.
