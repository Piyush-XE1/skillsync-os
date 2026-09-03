# ⚡ SkillSync OS

> **Your personal operating system for learning, building, planning, and becoming better.**

SkillSync OS brings **learning, projects, planning, habits, notes, reminders, focus, academics and career** into one unified productivity system.

Built with a **premium futuristic UI**, animated Aurora backgrounds, an offline-first architecture, gamification, and a dedicated Android experience.

## ✨ Features

| Module                     | What it does                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 📊 **Dashboard**           | A widget grid you own — streaks, XP, smart "Today" queue, continue-learning, habits, badges, daily insight                                                   |
| 🧩 **Widget Grid**         | 23 dashboard widgets: hide, resize (small/wide/tall/full) and drag them into place; the layout persists with the workspace                                   |
| 📅 **Week in Review**      | An auto-generated weekly report card — effort score, grade, day-by-day bars, week-over-week deltas, highlights & next-up nudges. Press `R`!                  |
| 🎓 **Learn**               | Structured roadmaps with phases, topics, checklists, resources & progress                                                                                    |
| ⏱️ **Focus**               | Pomodoro deep-work timer — sessions, sounds, XP and a focus streak                                                                                           |
| 🎯 **CGPA Tracker**        | Semester-wise SGPA, cumulative CGPA, grade breakdown & target simulator                                                                                      |
| 📄 **Resume Builder**      | Structured editor → print-ready ATS-friendly resume, JSON import/export                                                                                      |
| 💻 **Code · DSA Prep**     | Track solved problems across LeetCode, Codeforces, CodeChef & more — difficulty breakdowns, solve heatmap, streaks & contest ratings                         |
| 🤝 **Career · Placements** | Job & internship pipeline from Saved → Applied → Referral → OA → Interview → Offer, with rounds & referrals                                                  |
| 🔍 **Command Palette**     | `/` or `⌘K` anywhere — search every roadmap, topic, note, project & task                                                                                     |
| 🏆 **Achievements**        | 26 badges with one-time XP awards, notifications & level-ups — plus a dedicated **Trophies** page, rank titles (Rookie → Grandmaster) and per-badge progress |
| 🎨 **Theme Studio**        | Pick an accent colour (or any custom hue) and the entire OS re-skins instantly — cards, gradients, chips and glows all follow                                |
| 🎉 **Confetti**            | A dependency-free particle celebration on achievement unlocks, level-ups and completed focus sessions                                                        |
| 🔊 **Sound Design**        | A dependency-free Web Audio cue system — taps, lifts, drops, streaks, level-ups, timer ticks — with a master switch, volume slider and per-cue previews      |
| 🚀 **Projects**            | Status, progress, deadlines, tasks and tech stack tracking                                                                                                   |
| 📅 **Planner**             | Tasks with priorities, done timestamps and a smart Today queue                                                                                               |
| 🔥 **Habits**              | Check-ins, per-habit streaks (current & best) and consistency heatmaps                                                                                       |
| 📝 **Notes**               | Local-first notes with autosave                                                                                                                              |
| 🔔 **Notifications**       | Reminders, alerts, achievement pings & weekly digest                                                                                                         |
| 📈 **Analytics**           | GitHub-style activity heatmap, momentum & deep-work area charts, learning donut, coding bar chart + difficulty/platform donuts, habit trends                 |
| 🧾 **System**              | Workspace diagnostics — schema version, storage, record counts                                                                                               |
| 📱 **Android App**         | Native Android experience with haptics & system navigation                                                                                                   |
| 🌌 **Aurora UI**           | Animated futuristic visual environment (plus Light & Atelier themes)                                                                                         |
| ⚡ **Offline-First**       | Everything works without internet; data never leaves the device                                                                                              |

## ⌨️ Keyboard shortcuts

| Keys                              | Action                                          |
| --------------------------------- | ----------------------------------------------- |
| `/` or `⌘/Ctrl + K`               | Open command palette (workspace-wide search)    |
| `F`                               | Jump to the Focus timer                         |
| `C`                               | Jump to the Code (DSA prep) module              |
| `G`                               | Jump to the Trophies / Achievements page        |
| `R`                               | Jump to the Week in Review page                 |
| `↑↓` / `Enter` / `Esc`            | Navigate results inside the palette             |
| `Space` / `↑↓←→` / `Home` / `End` | Reorder a widget or list row from its drag grip |

## 🛠️ Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **TanStack Router + TanStack Start** — file-based routing, SSR-safe shell
- **Tailwind CSS v4** — design tokens and utilities
- **Zustand** — local-first store, persisted to `localStorage`
- **Zod** — runtime validation of every persisted record, schema-versioned migrations (v1 → v8)
- **Vitest** — 185+ unit & render tests for the domain/rule engines and the custom SVG chart geometry
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
Migrations (v1→v10, field-by-field salvage on corruption)
   │  validate
Schema (zod — single source of truth for every record)
   │  derive
Domain libs (progress, streaks, CGPA, focus, achievements, search, widgets,
             drag-sort, sound…)
```

Every record that touches disk is validated by Zod on read and write. Backups are
versioned envelopes; imports run the full migration chain. Full details in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🚀 Getting started

```bash
npm install         # or: bun install

npm run dev         # start the dev server (hot reload)
npm run typecheck   # strict TS check
npm run lint        # eslint
npm run test        # vitest suite (260+ tests)
npm run build       # production build (TanStack Start + Nitro)
```

> The app is **offline-first** and renders client-side (`ssr: false`), so all of
> your data lives in `localStorage`. Nothing leaves the device unless you
> explicitly export a backup.

## ✅ Testing

Core domain logic — migrations, backup/restore, the notification rule engine,
progress calculation, roadmap import, URL safety, streaks, CGPA math, focus
stats, achievements, quotes, search, the widget layout model, drag-sort slot
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
- [x] Focus timer with XP & streaks
- [x] CGPA tracker with target simulator
- [x] Resume builder with print/PDF export
- [x] DSA practice tracker with solve heatmap, streaks & contest ratings
- [x] Placement / job application tracker with interview rounds
- [x] Command palette with global keyboard shortcuts
- [x] Achievements & gamification engine
- [x] Activity heatmaps & learning velocity analytics
- [x] Local notifications · Android APK · native haptics
- [x] Schema-versioned migrations (v1 → v8) with corruption salvage
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
