# SkillSync OS — Architecture

> How a local-first personal-growth OS is designed, persisted, migrated and
> shipped. Written for maintainers, interviewers and curious engineers.

## 1. Design goals

1. **Offline-first.** The product works with zero network access; the browser
   app and the Android APK share one codebase and one data model.
2. **Data is the product.** Every record is validated at the boundary —
   nothing malformed ever reaches a component.
3. **Upgrades never lose data.** The persisted schema is versioned (v1 → v8)
   and migrated automatically, with field-level salvage when corruption is
   found.
4. **Everything measurable.** XP, streaks, achievements, focus sessions and
   activity heatmaps are all derived from the same event-like records —
   nothing is tracked twice.

## 2. Layers

```
┌────────────────────────────────────────────────────────────┐
│  Routes (src/routes/*.tsx)                                 │
│  TanStack Router file-based routes. UI only — no business  │
│  logic. Routes read state and call typed store actions.    │
├────────────────────────────────────────────────────────────┤
│  Store (src/store/useAppStore.ts)                          │
│  zustand + persist. One typed action per mutation; actions │
│  own cascade rules (topic → subtopic → checklist) and      │
│  gamification (XP awards, streaks, completedAt stamps).    │
├────────────────────────────────────────────────────────────┤
│  Migrations (src/lib/migrations.ts)                        │
│  Pure functions v1→v10. Each migrator is additive. On      │
│  invalid input the engine salvages valid top-level fields  │
│  one by one instead of crashing or wiping.                 │
├────────────────────────────────────────────────────────────┤
│  Schema (src/lib/schema.ts)                                │
│  Zod schemas — the single source of truth for every        │
│  persisted record and for backup envelopes.                │
├────────────────────────────────────────────────────────────┤
│  Domain libs (src/lib/*)                                   │
│  Pure, unit-tested engines: progress, habit streaks,       │
│  CGPA math, focus stats, achievements, search, quotes,     │
│  notifications, backup. No React, no DOM.                  │
└────────────────────────────────────────────────────────────┘
```

## 3. Persistence & migrations

- The zustand store persists to `localStorage` under `skillsync:data:v1`
  (stable key) with `partialize` stripping every function — only plain data
  survives.
- `schemaVersion` lives **inside** the payload. Zustand's persist `version`
  bumps alongside it, so a stored v6 payload is routed through the migration
  chain and emerges as valid v10 data.
- Migrations are **additive**: new domains (Focus, CGPA, Resume) start empty
  with safe defaults; existing records are enriched (e.g. planner tasks gain
  `priority`, topics gain `completedAt`).
- If the full parse fails, `migrate()` re-parses each top-level field against
  its own schema and keeps the survivors — a corrupted single module can
  never take down the whole workspace.

## 4. Gamification engine

- **XP awards** live in the store as pure helpers (`addXpToStats`,
  `touchStreakStats`) so they are deterministic and unit-testable. Awards
  fire on checklist/topic/subtopic completion, planner check-offs, habit
  check-ins, project ships, focus sessions and achievement unlocks.
- **Achievements** (`src/lib/achievements.ts`) are declarative predicates
  over `AppData`. The engine hook (`useAchievementEngine`) evaluates on a
  debounced store subscription, unlocks new badges exactly once (idempotent
  by stored id list), and fires XP + toast + haptic + sound cue + confetti +
  notification (level-ups get their own rising arpeggio). The notification
  runner dedupes via `sourceId`.

## 5. Derived analytics

No analytics event is stored twice. Charts derive from source records:

- **Activity heatmap** — habit logs ×2, focus sessions, planner `doneAt`,
  topic `completedAt` (timestamps added in v7).
- **Learning velocity** — `completedAt` deltas between rolling 7-day windows.
- **Habit consistency** — per-habit check-in grids + current/best streaks
  computed from the log list.

## 6. Notifications

The rule engine (`src/lib/notifications/engine.ts`) generates due candidates
from workspace state (habits, planner, attendance, backup age, weekly
summary). Delivery adapts to the platform:

- **Android (Capacitor)** — native local notifications via the bridge.
- **Browser** — service worker + Web Notifications.
- Everywhere — in-app notification history with read/unread state.

## 7. Android (Capacitor)

`scripts/build-mobile.mjs` produces a `www/` bundle; `cap sync` updates the
Android project; Gradle assembles debug/release APKs. Native back
navigation, haptics and notifications flow through
`src/lib/native/bridge.ts`, with web fallbacks everywhere.

## 8. Quality gates

- `npm run typecheck` — strict TypeScript, zero `any` leaks in the domain.
- `npm run lint` — eslint + prettier.
- `npm run test` — 260+ Vitest tests: pure Node for libs, jsdom for the store,
  drag-sort/keyboard interaction and route render smoke tests.
- CI (GitHub Actions) runs all three plus a production build on every PR.

## 9. Design system

Three themes (Aurora, Light, Atelier) share one token set in `styles.css`.
Components consume semantic tokens only (`var(--primary)`, `card-surface`,
`gradient-primary`…), so adding a theme is a token exercise, not a component
rewrite.

## 10. Interaction layer — widgets, drag-sort & sound

Three dependency-free primitives carry the "feels native" layer. None of them
add a runtime package, and all three are unit-tested beside their source.

- **Widget system** — the dashboard is a grid the user owns. `src/lib/widgets.ts`
  holds the pure model (a 23-widget catalog with id, title, default size and an
  optional module gate, plus `normalizeWidgetLayout`, `visibleWidgets` and
  `applyWidgetOrder`), `src/components/widgets/` renders it (`WidgetFrame`
  chrome, `tiles`/`panels`, `registry`, `WidgetGrid`, `WidgetCustomizer`) and the
  store exposes typed actions (`setWidgets`, `toggleWidget`, `resizeWidget`,
  `reorderWidgets`, `moveWidgetTo`, `resetWidgets`). Layout persists as
  `widgets: WidgetPlacement[]` (schema v10) — never as component state.
- **Drag & keyboard reorder** — `src/lib/drag-sort.ts` computes target slots from
  _measured_ item rects (variable heights, either axis) and `DragSortList.tsx`
  drives the gesture: pointer + long-press lift, transform-only movement,
  auto-scroll of the real scroll container, a settle transition on release, and
  a full keyboard path on the grip (Space to lift, arrows to move, Enter/Space
  to drop, Escape to cancel, Home/End to jump) with `aria-live` announcements.
  The expenses transaction list and the widget grid share it.
- **Sound** — `src/lib/sound.ts` is a tiny Web Audio synth (pentatonic palette
  through a master gain → lowpass) with semantic cues: `tap`, `select`,
  `toggle`, `open`/`close`, `lift`/`move`/`drop`, `success`, `complete`, `coin`,
  `trash`, `error`, `streak`, `achievement`, `levelUp`, `chime`, `tick`. It mirrors `haptics.ts`: SSR-safe, never throws, unlock on first
  user gesture, per-cue cooldowns so rapid input can't machine-gun. Preferences
  (`sound`, `soundVolume`) persist in the schema and are editable in
  Profile → Sound design, where every cue can be previewed.
