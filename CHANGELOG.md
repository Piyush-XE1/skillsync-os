# Changelog

All notable changes to SkillSync OS are documented here.

## [4.2.0] — 2026-09-25

### Added

- **"Today" hero on the dashboard.** The first surface after the brand opening
  now leads with live telemetry instead of decoration: a ticking clock, habit
  and deep-work progress rings, count-up tiles for solved problems / planner
  load / best streak, a 7-day activity strip, and the user's pinned aims with
  one-tap entry into Focus and Aims. Backed by a new pure module
  (`src/lib/today.ts`) with an injected clock, unit-tested end to end
  (`todaySummary`, `activityStrip`).
- **Project showcase (`/showcase`, keyboard `?`)** — a viva-ready dossier:
  stack, feature highlights, a five-layer architecture map, engineering
  decisions, live metrics and the demo-mode controls.
- **Demo workspace.** A deterministic, seeded persona (`src/lib/demo.ts`) with
  six semesters of CGPA, 148 solved problems, a placement pipeline, 120 days of
  habit history, roadmaps, notes, planner, expenses and notifications. Loading
  it snapshots the real workspace to `skillsync:demo:snapshot`; exiting — or
  simply relaunching the app after a crash (`useDemoRecovery`) — restores it
  byte for byte. A shell-level banner makes the state impossible to miss, and
  `demoMode` is never persisted, exported or backed up.
- **Motion & surface system** in `styles.css`: `aurora-panel`, `stat-tile`,
  `glow-hover`, `animate-rise` with a `--i` stagger index, `sheen`, ambient
  `drift`/`breathe` loops, themed scrollbars, selection colour and a
  focus-visible ring — all opacity/transform only, all collapsed by
  `prefers-reduced-motion`.
- **Scroll progress rail** and a polished `PageHeader` (accent eyebrow, gradient
  rule) in the app shell; widget cards lift with an accent rim on hover and the
  grid fades in with a per-slot stagger; the side and bottom navigation show
  accent-glowing active states.

### Changed

- README gains a **project dossier** section (layer diagram, engineering
  highlights, demo instructions); ARCHITECTURE documents the today layer, demo
  mode and the motion system as §11–13. `APP_VERSION` is now 4.2.

### Fixed

- Removed the dead `resume-print` stylesheet left behind when the Resume module
  was deleted in 4.1.

## [4.1.0] — 2026-09-25

### Removed

- **The Resume builder is gone — the app builds habits and skills, not
  documents.** Removed end to end:
  - the **Resume** page (`src/routes/resume.tsx`, `/resume`) with its editor,
    print preview, PDF export and sample-resume importer,
  - the `ResumeSchema` record block (`name`, `title`, `contact`, `summary`,
    `skills`, `education`, `experience`, `projects`, `certifications`) and the
    `resume` module flag from `PreferencesSchema`,
  - the store's `updateResume` / `setResume` actions, the sidebar entry, the
    command-palette page entry and quick-launch tile, the Profile card and the
    Profile → Modules toggle,
  - the "Resume" row from the backup change detector and backup summary.

### Changed

- **Schema v12** with a v11 → v12 migrator that drops the stored `resume`
  block and the `resume` module flag. Everything else — aims, habits, focus,
  CGPA, coding, career, notes, planner, backups — migrates untouched.
- `APP_VERSION` is now 4.1.

## [4.0.0] — 2026-09-25

### Removed

- **The reward system is gone: no XP, no levels, no badges, no trophies.** It
  was the wrong motivation model for a tool you use on yourself — and the
  first thing to feel like a toy. Removed end to end:
  - `src/lib/achievements.ts` (26 declarative badges) and its test suite,
  - the `useAchievementEngine` hook (toasts, confetti bursts, unlock
    notifications, level-up celebrations),
  - the **Trophies** page (`/achievements`), the `xp` / `streak` /
    `achievements` / `nextBadge` dashboard widgets and the Profile badge
    showcase,
  - the global daily-streak counter and its milestone notifications (per-habit
    streaks stay — they are a consistency signal, not a score),
  - the `achievement` and `levelUp` sound cues, the XP readouts in Analytics,
    Week in Review, Profile, System and the weekly digest,
  - the stored `stats` block (`xp`, `level`, `streak`, `lastActive`, `totalXp`,
    `achievements`) and the `achievements` notification category.

### Added

- **Aims — a highlighted goals panel.** A new `Goal` record (`id`, `title`,
  `emoji`, `note`) plus a new **Aims** page (`/goals`, keyboard `G`) where you
  declare what you are actually working on: Gym, No junk food, Good at
  academics, No fap, and anything else you type. Quick-add presets make it one
  tap; aims can be edited, reordered by drag and removed.
- **The dashboard's top slot is now Aims.** A full-width, accent-glowing
  `goals` widget (`src/lib/goals.ts` + `GoalsWidget`) that lists your aims and
  offers one-tap presets when the list is empty, with a **Manage** link into
  the page. Ordering, resizing, hiding and customize mode all work exactly like
  every other widget.
- **Aims in Profile**, plus an aims count in Profile → System diagnostics.
- **Aims in the weekly review** — the hero line now reads active days + aims in
  focus instead of streak/level/XP.
- **Habit-only analytics** — the Analytics header card now reports _habit
  streaks alive_ and _focus minutes (14 days)_ instead of a global streak and a
  level ring.

### Changed

- **Schema v11** with a v10 → v11 migrator that drops the retired `stats`
  block, strips the retired notification category (setting, history and queued
  entries) and lifts the Aims panel to the top of an existing dashboard. A
  migrated workspace starts with an empty aims list — starter aims (Gym, No
  junk food, Good at academics, No fap) are seeded for brand-new workspaces
  only. App version → **4.0**.
- `applyOrder`-style scoped reordering for aims, so a drag can never shuffle or
  drop an aim it did not touch.

### Fixed

- Anything that still read a reward field after the removal would have rendered
  `undefined` or rejected an old workspace on parse; the migrator and the
  strict-schema tests cover those paths (`migrations.test.ts` asserts the stats
  block and the achievements category are gone after an upgrade).

## [3.6.0] — 2026-09-07

### Changed

- **The backup system is now one system.** The legacy
  (`src/lib/backup-legacy.ts`) and "advanced" implementations were merged into
  a single v4 envelope (`src/lib/backup/*`) with one screen
  (Profile → **Backup & Restore**), one zustand store and one scheduler. The
  duplicate screens, dead tabs and half-wired options are gone, along with
  `use-advanced-backup.ts`, `cloud-backup.ts`, `backup-storage.ts` and
  `BackupSection.advanced.tsx`.
- **No backup payloads in `localStorage` again.** Copies live in an IndexedDB
  vault (`skillsync-vault`, with an honest in-memory fallback and a one-time
  migration of old payloads); only settings and last-backup metadata stay in
  `localStorage`. The 1.5 s debounced snapshot loop that re-serialised up to
  three full workspaces after every edit is gone — this was the source of the
  typing lag on large workspaces.
- **Cloud backup is reachable and real.** `CloudPanel` lists four providers —
  GitHub Gist, WebDAV, Google Drive, Dropbox — each with the exact setup steps
  rendered in-app, a status line, a test connection, a file browser
  (restore / delete / open) and an auto-upload switch. Tokens are stored in the
  vault and never written into a backup file.
- **Restore is a staged flow**: review what is inside (password asked first for
  encrypted files) → confirm → apply, always with a pre-restore `safety`
  snapshot and a one-tap **Undo that restore**.
- **Simplified wording** across the screen ("On this device", "Cloud copies",
  "Automatic copies", "Options for the next backup"), with empty states and
  caveats that describe what will actually happen.

### Fixed

- Encrypted backups could not be restored, and compressed ones inside an
  encrypted envelope failed the same way: only the payload is
  compressed/encrypted now, and the read path is unwrap → decrypt → decompress
  → parse → checksum (both are covered by tests).
- A manual backup pruned **every** rolling copy instead of only the `auto`
  kind, quietly deleting backup history.
- Dropbox sign-in could never finish: the PKCE challenge was hashed from a
  second random verifier, and the token exchange targeted the API host instead
  of `api.dropbox.com`. Access tokens are now refreshed before they expire
  (~4 h), so a connection stops dying overnight.
- **Undo that restore** opened another review dialog and did nothing; it now
  applies the snapshot and consumes it.
- Re-uploading the same copy to a gist created a duplicate gist; it now updates
  the recorded one and recreates it if it was deleted remotely.
- Health checks no longer parse and hash payloads on a timer — they read backup
  metadata, so opening the profile screens stays smooth.
- `formatRelative` rounded 30 s to "1 min ago"; the router and root error
  boundaries now type-check (`npx tsc --noEmit` is clean repo-wide).

### Tests

- 124 tests around the backup system across 8 files (envelope, vault with and
  without IndexedDB, every provider's HTTP requests, the store's create →
  restore → undo → auto → cloud loop, and the screen driven by its labels).
  Full suite: 371 passing.

### Documentation

- `BACKUP_SYSTEM.md` rewritten as the format/architecture reference, including
  per-provider setup guides (GitHub PAT + `gist` scope, WebDAV CORS,
  Google OAuth JS origins, Dropbox PKCE + redirect URI) and `ADVANCED_BACKUP_SUMMARY.md`
  replaced with the record of this rebuild.

## [3.5.0] — 2026-09-03

### Added

- **Widget dashboard** — the home screen is now a grid the user owns. 23
  widgets (streak, level & XP, today queue, continue learning, focus ring,
  habits, money this month, coding heat, career pipeline, week in review,
  badges, quote of the day and more) can be **hidden, resized**
  (small / wide / tall / full) and **dragged into place** from a _Customize_
  mode with a jiggling grid, per-widget grips and a widget library sheet.
  The layout is persisted (`widgets: WidgetPlacement[]`) and survives reload,
  backup and restore; widgets whose module is switched off hide automatically.
- **`src/lib/widgets.ts`** — pure widget catalog + layout model
  (`normalizeWidgetLayout`, `visibleWidgets`, `applyWidgetOrder`,
  `setWidgetVisible`, `resizeWidget`), with store actions `setWidgets`,
  `toggleWidget`, `resizeWidget`, `reorderWidgets`, `moveWidgetTo` and
  `resetWidgets`.
- **Sound design** — a dependency-free Web Audio cue engine
  (`src/lib/sound.ts`) with 18 semantic cues (tap, select, toggle, open/close,
  lift/move/drop, success, complete, coin, trash, error, streak, achievement,
  level-up, chime, tick) built from a pentatonic palette through a
  master gain and lowpass filter. Wired app-wide: navigation, sheets and
  dialogs, toggles, the focus timer (including a 5-second countdown), habit
  check-ins, planner tasks, learning progress, expenses, projects, attendance,
  coding, career, CGPA, resume, review, backups and achievement unlocks.
  Profile → **Sound design** exposes a master switch, a volume slider and a
  preview grid for every cue. Like haptics, it is SSR-safe, never throws,
  unlocks on the first user gesture and rate-limits repeated cues.
- **Drag-sort primitive** — `src/lib/drag-sort.ts` (pure slot math over
  _measured_ rects, either axis) plus `src/components/common/DragSortList.tsx`
  (pointer + long-press lift, transform-only motion, real scroll-container
  auto-scroll, settle transition, and a complete keyboard path on the grip:
  Space to lift, arrows to move, Home/End to jump, Escape to cancel, with
  `aria-live` announcements).

### Changed

- **Expenses reordering rewritten** on the shared primitive — no more
  fixed-row-height assumptions, jumpiness on variable-height rows, stuck
  ghosts or scroll drift. Reorders are now undoable from a toast, announce
  their position while dragging, and play lift/move/drop cues.
- **Schema v10** — `PreferencesSchema` gains `sound` and `soundVolume`;
  `AppDataSchema` gains `widgets`. The v9→v10 migrator adds safe defaults, so
  existing workspaces upgrade without losing data.
- Overlay plumbing centralised (`OverlayPortal`, focus trap, Escape stack) so
  sheets, dialogs and the command palette share one dismiss/announce behaviour.
- Test suite expanded to **264 tests across 38 files** (widgets, drag-sort,
  sound, DragSortList interaction, dashboard render). `typecheck`, `lint`
  (0 errors) and `build` all green.

## [3.4.0] — 2026-09-02

### Added

- **Week in Review** (`/review`) — a pure, auto-generated weekly report card
  that turns the workspace into plain-English insights: an **effort score**
  (weighted activity across habits, focus, topics, tasks & solves), a **grade**
  (Warming up → Building momentum → Solid → Great → Outstanding), per-day score
  bars with a best-day highlight, **week-over-week deltas** for every metric,
  narrative **highlights**, and data-driven **next-up suggestions**.
- **`R` keyboard shortcut** jumps straight to Review; it's also in the sidebar
  and the command palette quick-launch.
- **`src/lib/review.ts`** — pure, deterministic review model with unit tests;
  regenerates live as the user keeps working.

### Changed

- Test suite expanded to 194 tests (review model + render). `typecheck`, `lint`
  (0 errors) and `build` all green.

## [3.3.0] — 2026-09-02

### Added

- **Dependency-free charting engine** — a hand-written SVG chart system
  (`src/lib/charts.ts` + `src/components/common/Charts.tsx`): smooth area
  charts, rounded bar charts, donut rings, sparklines and hover tooltips, all
  theme-aware (they inherit the active accent and adapt to Light / Atelier). No
  chart library, no new runtime dependencies.
- **Analytics redesign** — the Insights page now ships rich visualisations:
  a 30-day **Momentum** area chart (weighted daily effort), a **Deep work** area
  chart with mini stats, a **Learning completion** donut, a **Coding solved**
  weekly bar chart, and **Difficulty + Platform** donuts with legends.
- **Dashboard "This week" strip** — three live sparklines (Momentum, Deep work,
  DSA solved) so the home screen tells a story at a glance.
- **Trend helpers** (`src/lib/trends.ts`) — pure functions that convert raw
  store slices into chart-ready series, covered by unit tests.

### Changed

- Test suite expanded to 186 tests (chart geometry, trend series, analytics
  render). `typecheck`, `lint` (0 errors) and `build` all green.

## [3.2.0] — 2026-09-02

### Added

- **Theme Studio** — a complete accent re-skin. Pick from curated accents (or any
  custom colour) and the entire OS — cards, gradients, chips, progress rings and
  glows — re-themes instantly. A `v8 → v9` migrator seeds a tasteful default
  accent per background so existing users see no change until they open it.
- **Confetti celebration engine** — a dependency-free, canvas-based particle
  simulator (gravity, air drag, spin, flutter) that fires on achievement
  unlocks, level-ups and completed focus sessions. Zero runtime deps, ~2 KB.
- **Trophies page** (`/achievements`) — a dedicated badge collection with an
  overall completion ring, badge XP, player ranks (Rookie → Explorer → Builder →
  Achiever → Grandmaster) and per-badge progress bars.
- **`G` keyboard shortcut** jumps straight to the Trophies page.
- Trophies reachable from the sidebar, command palette quick-launch and the
  Profile badges section.

### Changed

- Test suite extended (accent palette, `v8 → v9` migration, schema defaults).
- README updated with the new keyboard shortcuts and feature set.

## [3.1.0] — 2026-09-02

### Added

- **Code · DSA Prep module** (`/coding`) — log solved problems across LeetCode,
  Codeforces, CodeChef, GeeksforGeeks, HackerRank and more, with difficulty
  breakdowns, a GitHub-style solve heatmap, current/best solve streaks,
  per-platform and per-tag stats, big-O notes, and contest-rating tracking.
- **Career · Placements module** (`/career`) — track job and internship
  applications through a full pipeline (Saved → Applied → Referral → OA →
  Interview → Offer → Rejected), with referrals, salary, links, and a nested
  interview-round tracker (phone/virtual/onsite/takehome/assignment) with
  pending/cleared/rejected outcomes.
- **Schema v8** — `coding` and `career` domains with a v7 → v8 migrator;
  both modules on by default for new and existing workspaces.
- **Achievements** — 8 new badges (first problem, 50/150 problems, 7-day solve
  streak, hard problem, first application, offer received) with XP rewards.
- **Dashboard "Placement Prep" row** — live solves, streak, today count,
  applications, interview rounds and referral stats at a glance.
- **`C` keyboard shortcut** jumps straight to the Code module.
- **Analytics** — coding solves now contribute to the global activity heatmap.
- **Command palette** — searchable problems and applications, plus Code and
  Career quick-launch pages.

### Changed

- Sidebar, Profile → Modules and the command palette now include Code and Career
  (module-gated with `C` hint).
- Test suite expanded to 160+ tests covering coding stats, streaks, career
  stats, migrations v7 → v8 and route rendering.

## [3.0.0] — 2026-09-01

### Added

- **Focus module** — Pomodoro timer with focus/break phases, task labels,
  duration presets, completion chime, auto-start settings, XP rewards and a
  deep-work streak.
- **CGPA tracker** — semester-wise subjects with credits and 10-point grades,
  automatic SGPA/CGPA, grade breakdown, and a target simulator that computes
  the SGPA needed to hit a goal.
- **Resume builder** — structured editor (personal, summary, skills,
  education, experience, projects, certifications), autosave, JSON
  import/export, example payload, and a print-ready A4 preview with
  print-to-PDF support.
- **Command palette** (`/search`) — unified workspace search across roadmaps,
  topics, notes, projects, tasks, habits and pages, with keyboard navigation.
- **Global keyboard shortcuts** — `/` or `⌘K` opens the palette, `F` jumps to
  Focus.
- **Achievements engine** — 18 badges (first topic → 50 topics, streaks,
  projects shipped, 10h of focus, 9+ CGPA, resume-ready…) with one-time XP
  awards, in-app notifications, toasts and level-up celebrations.
- **Gamification upgrades** — lifetime XP, XP awards for completing topics,
  subtopics, tasks, projects and focus sessions; `completedAt` / `doneAt`
  stamps power the new activity history.
- **Per-habit streaks** — current and best streak per habit, shown on the
  dashboard, habits and analytics.
- **Analytics 2.0** — GitHub-style 90-day activity heatmap, learning
  velocity, 14-day deep-work chart, per-habit consistency grids and a level
  ring.
- **Dashboard 2.0** — four-stat row (streak, level ring, focus minutes,
  habits), continue-learning card, smart Today queue with overdue + priority
  chips, inline habit toggles, achievements strip, next-badge hints and a
  daily insight quote.
- **System page** (`/profile/system`) — schema version, storage usage, record
  counts, architecture overview.
- **Schema v7** — focus sessions, CGPA, resume, enriched stats and planner
  priorities, with a v6 → v7 migrator and per-field corruption salvage.
- **Docs** — `docs/ARCHITECTURE.md`, expanded `README.md`, changelog, route
  map, and a generated OG share image.

### Changed

- Sidebar now includes Focus, CGPA, Resume and Search (module-gated), with
  keyboard hints.
- Profile page gains a badge showcase and Career & Academics quick links.
- Profile → Modules includes toggles for the three new modules.
- Test suite expanded to 150+ tests covering the new domains.

## [2.0.0] and earlier

- Core productivity system (Learn, Projects, Planner, Habits, Notes).
- Attendance and Expense modules.
- Local notifications, Android APK, native haptics, app opening experience.
- Aurora UI, Light theme, Atelier background.
- Backup/restore envelopes, schema migrations v1 → v6.
- Vitest suite and CI (typecheck · lint · tests · build).
