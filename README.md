# ⚡ SkillSync OS

> **Your personal operating system for learning, building, planning, and becoming better.**

SkillSync OS brings **learning, projects, planning, habits, notes, reminders, focus, academics and career** into one unified productivity system.

Built with a **premium futuristic UI**, animated Aurora backgrounds, an offline-first architecture, and a dedicated Android experience. No XP, no levels, no badges — just the aims you are working on and honest progress.

> 🎓 **Final-year B.Tech CSE major project.** The whole engineering story — architecture, decisions, metrics — lives in-app at **`/showcase`** (press `?`), with a **one-tap demo workspace** that fills the app with a realistic student persona without touching your own data.

## ✨ Features

| Module                     | What it does                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📊 **Dashboard**           | A widget grid you own — your aims up top, smart "Today" queue, continue-learning, habits, focus and daily insight                                        |
| 🛰️ **Today Hero**          | The first thing you see: live clock, habit & deep-work rings, solves, best streak, a 7-day activity strip and your pinned aims — all count-up animated   |
| 🧩 **Widget Grid**         | 20 dashboard widgets: hide, resize (small/wide/tall/full) and drag them into place; the layout persists with the workspace                               |
| 🎓 **Project Showcase**    | `/showcase` (`?`) — the viva-ready dossier: stack, five-layer architecture, engineering decisions, live metrics and a deterministic **demo workspace**   |
| 📅 **Week in Review**      | An auto-generated weekly report card — effort score, grade, day-by-day bars, week-over-week deltas, highlights & next-up nudges. Press `R`!              |
| 🎓 **Learn**               | Structured roadmaps with phases, topics, checklists, resources & progress                                                                                |
| ⏱️ **Focus**               | Pomodoro deep-work timer — sessions, sounds and a focus streak                                                                                           |
| 🎯 **CGPA Tracker**        | Semester-wise SGPA, cumulative CGPA, grade breakdown & target simulator                                                                                  |
| 💻 **Code · DSA Prep**     | Track solved problems across LeetCode, Codeforces, CodeChef & more — difficulty breakdowns, solve heatmap, streaks & contest ratings                     |
| 🤝 **Career · Placements** | Job & internship pipeline from Saved → Applied → Referral → OA → Interview → Offer, with rounds & referrals                                              |
| 🔍 **Command Palette**     | `/` or `⌘K` anywhere — search every roadmap, topic, note, project & task                                                                                 |
| 🎯 **Aims & Goals**        | The goals you are working on — gym, no junk food, academics, no fap, or anything you type — pinned in a highlighted dashboard panel with one-tap presets |
| 🎨 **Theme Studio**        | Pick an accent colour (or any custom hue) and the entire OS re-skins instantly — cards, gradients, chips and glows all follow                            |
| 🎉 **Confetti**            | A dependency-free particle celebration on habit streaks and completed focus sessions                                                                     |
| 🔊 **Sound Design**        | A dependency-free Web Audio cue system — taps, lifts, drops, streaks, timer ticks — with a master switch, volume slider and per-cue previews             |
| 🚀 **Projects**            | Status, progress, deadlines, tasks and tech stack tracking                                                                                               |
| 📅 **Planner**             | Tasks with priorities, done timestamps and a smart Today queue                                                                                           |
| 🔥 **Habits**              | Check-ins, per-habit streaks (current & best) and consistency heatmaps                                                                                   |
| 📝 **Notes**               | Local-first notes with autosave                                                                                                                          |
| 🔔 **Notifications**       | Reminders, alerts & weekly digest                                                                                                                        |
| 📈 **Analytics**           | GitHub-style activity heatmap, momentum & deep-work area charts, learning donut, coding bar chart + difficulty/platform donuts, habit trends             |
| 🧾 **System**              | Workspace diagnostics — schema version, storage, aims, record counts                                                                                     |
| 📱 **Android App**         | Native Android experience with haptics & system navigation                                                                                               |
| 🌌 **Aurora UI**           | Animated futuristic visual environment (plus Light & Atelier themes)                                                                                     |
| ⚡ **Offline-First**       | Everything works without internet; data never leaves the device                                                                                          |

## ⌨️ Keyboard shortcuts

| Keys                              | Action                                          |
| --------------------------------- | ----------------------------------------------- |
| `/` or `⌘/Ctrl + K`               | Open command palette (workspace-wide search)    |
| `F`                               | Jump to the Focus timer                         |
| `C`                               | Jump to the Code (DSA prep) module              |
| `G`                               | Jump to your Aims / Goals page                  |
| `R`                               | Jump to the Week in Review page                 |
| `?`                               | Open the project showcase (dossier + demo mode) |
| `↑↓` / `Enter` / `Esc`            | Navigate results inside the palette             |
| `Space` / `↑↓←→` / `Home` / `End` | Reorder a widget or list row from its drag grip |

## 🛠️ Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **TanStack Router + TanStack Start** — file-based routing, SSR-safe shell
- **Tailwind CSS v4** — design tokens and utilities
- **Zustand** — local-first store, persisted to `localStorage`
- **Zod** — runtime validation of every persisted record, schema-versioned migrations (v1 → v12)
- **Vitest** — 47 suites / 388 unit & render tests for the domain/rule engines, the store and the route render smoke tests
- **Custom SVG charts** — dependency-free area, bar, donut, sparkline & tooltip components (no chart library)
- **Capacitor** — native Android shell, haptics, notifications, file save/share
- **GitHub Actions** — CI (typecheck · lint · tests · build) + signed APK releases

## 🏗️ Architecture

The app is a **local-first, schema-versioned data system** with a strict layering:

```
Routes (React, file-based)
   │  read/write via typed actions
Store (zustand + persist middleware)
   │  partialize → only plain data is persisted
Migrations (v1→v12, field-by-field salvage on corruption)
   │  validate
Schema (zod — single source of truth for every record)
   │  derive
Domain libs (progress, streaks, CGPA, focus, goals, search, widgets,
             drag-sort, sound…)
```

Every record that touches disk is validated by Zod on read and write. Backups are
versioned envelopes; imports run the full migration chain. Full details in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🎓 Project dossier (final-year major project)

SkillSync OS is built as a **single-developer, end-to-end engineering project** —
from schema design and migration engineering to the motion system, the Android
shell and the test suite. If you are evaluating it (or sitting in the viva), the
in-app dossier is at **`/showcase`** (press `?`).

**Five layers, one direction of dependency**

```
┌─ Presentation ───────────────────────────────────────────────┐
│  React 19 · TanStack Router (24 routes) · Tailwind v4        │
│  route splitting · keyboard-first nav · reduced-motion aware │
├─ Domain (pure TypeScript) ───────────────────────────────────┤
│  analytics · streaks · weekly review · focus · CGPA · goals  │
│  injected clock, no DOM, unit-tested                         │
├─ State ──────────────────────────────────────────────────────┤
│  Zustand store · every mutation an action · selector-driven   │
├─ Persistence ────────────────────────────────────────────────┤
│  Zod contracts · schema v12 · migrators v1 → v12             │
│  per-field salvage · JSON export/import · backup vault       │
├─ Platform ───────────────────────────────────────────────────┤
│  PWA shell · Capacitor Android · haptics · notifications     │
│  print/PDF surfaces · Web Audio sound design                 │
└──────────────────────────────────────────────────────────────┘
```

**Engineering highlights**

- **12 schema versions** with ordered, additive migrators — a v1 workspace still
  opens, and a workspace written by a broken build is salvaged field by field.
- **20-widget dashboard** the user owns: hide, resize, drag (pointer _and_
  keyboard), persisted as data and repaired on load.
- **Zero-dependency interaction layer** — drag-and-drop, charts, heatmaps,
  confetti, sound synthesis and the launch animation are all in-repo.
- **Demo mode that cannot hurt**: `/showcase` → _Load demo workspace_ snapshots
  your data, drops in a deterministic persona (6 semesters, 148 solved problems,
  120 days of habits) and restores your workspace on exit or on next launch.
- **47 test suites / 388 tests** with CI running typecheck, lint, tests and a
  production build.

## 🚀 Getting started

```bash
npm install         # or: bun install

npm run dev         # start the dev server (hot reload)
npm run typecheck   # strict TS check
npm run lint        # eslint
npm run test        # vitest suite (388 tests)
npm run build       # production build (TanStack Start + Nitro)
```

> The app is **offline-first** and renders client-side (`ssr: false`), so all of
> your data lives in `localStorage`. Nothing leaves the device unless you
> explicitly export a backup.

## ✅ Testing

Core domain logic — migrations, backup/restore, the notification rule engine,
progress calculation, roadmap import, URL safety, streaks, CGPA math, focus
stats, goals, quotes, search, the widget layout model, drag-sort slot
math, sound gating and the app store — is unit-tested with Vitest. Tests live beside the code (`src/**/*.test.ts`) and run in Node by
default; browser-only tests (the store, `localStorage` state, route rendering)
opt into jsdom with a `// @vitest-environment jsdom` comment.

```bash
npm run test            # run once
npm run test:watch      # watch mode
npm run test:coverage   # with an HTML coverage report
```

New logic should land with a test. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📱 Android

SkillSync OS can be packaged as a signed Android APK with:

- Native Android back navigation
- Haptic feedback
- Native local notifications
- Offline functionality
- Custom splash/opening experience
- Automated GitHub Actions APK builds
- Release signing

## 🎬 Brand Experience

The SkillSync opening experience introduces the app through a cinematic logo sequence:

**Energy → Orbit → Logo Formation → Brand Reveal → Dashboard**

**SKILLSYNC OS** — **ALIGN • CONNECT • ELEVATE**

The primary logo is a standalone S-shaped symbol representing synchronization, connection, alignment, and continuous growth.

## 🧠 Philosophy

SkillSync OS is built around a simple loop:

**Learn → Plan → Build → Track → Reflect → Improve**

Instead of using separate tools for every part of personal development, SkillSync aims to bring the entire system together in one place.

## 🗺️ Roadmap

- [x] Core productivity system · Dashboard · Learn · Projects · Planner · Habits · Notes
- [x] Focus timer with session stats & focus streaks
- [x] CGPA tracker with target simulator
- [x] DSA practice tracker with solve heatmap, streaks & contest ratings
- [x] Placement / job application tracker with interview rounds
- [x] Command palette with global keyboard shortcuts
- [x] Aims & goals panel (deliberately no XP, levels or badges)
- [x] Live "today" hero — rings, count-ups, 7-day activity strip
- [x] Project showcase page + deterministic demo workspace
- [x] Activity heatmaps & learning velocity analytics
- [x] Local notifications · Android APK · native haptics
- [x] Schema-versioned migrations (v1 → v12) with corruption salvage
- [x] Unit + render test suite (Vitest) · CI (typecheck · lint · tests · build)
- [ ] Cloud backup & sync
- [ ] Multi-device synchronization
- [ ] Further Android integrations
- [ ] Continued performance optimization

## 🚀 Status

**Active development.**

SkillSync OS is continuously evolving across performance, Android integration, UI polish, productivity features, and data synchronization.

---

### ⚡ SkillSync OS

**Align • Connect • Elevate**
