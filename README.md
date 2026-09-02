# ⚡ SkillSync OS

> **Your personal operating system for learning, building, planning, and becoming better.**

SkillSync OS brings **learning, projects, planning, habits, notes, reminders, focus, academics and career** into one unified productivity system.

Built with a **premium futuristic UI**, animated Aurora backgrounds, an offline-first architecture, gamification, and a dedicated Android experience.

## ✨ Features

| Module | What it does |
| --- | --- |
| 📊 **Dashboard** | Streaks, XP, smart "Today" queue, continue-learning, habits, badges, daily insight |
| 🎓 **Learn** | Structured roadmaps with phases, topics, checklists, resources & progress |
| ⏱️ **Focus** | Pomodoro deep-work timer — sessions, sounds, XP and a focus streak |
| 🎯 **CGPA Tracker** | Semester-wise SGPA, cumulative CGPA, grade breakdown & target simulator |
| 📄 **Resume Builder** | Structured editor → print-ready ATS-friendly resume, JSON import/export |
| 💻 **Code · DSA Prep** | Track solved problems across LeetCode, Codeforces, CodeChef & more — difficulty breakdowns, solve heatmap, streaks & contest ratings |
| 🤝 **Career · Placements** | Job & internship pipeline from Saved → Applied → Referral → OA → Interview → Offer, with rounds & referrals |
| 🔍 **Command Palette** | `/` or `⌘K` anywhere — search every roadmap, topic, note, project & task |
| 🏆 **Achievements** | 26 badges with one-time XP awards, notifications & level-ups |
| 🚀 **Projects** | Status, progress, deadlines, tasks and tech stack tracking |
| 📅 **Planner** | Tasks with priorities, done timestamps and a smart Today queue |
| 🔥 **Habits** | Check-ins, per-habit streaks (current & best) and consistency heatmaps |
| 📝 **Notes** | Local-first notes with autosave |
| 🔔 **Notifications** | Reminders, alerts, achievement pings & weekly digest |
| 📈 **Analytics** | GitHub-style activity heatmap, learning velocity, focus & habit trends |
| 🧾 **System** | Workspace diagnostics — schema version, storage, record counts |
| 📱 **Android App** | Native Android experience with haptics & system navigation |
| 🌌 **Aurora UI** | Animated futuristic visual environment (plus Light & Atelier themes) |
| ⚡ **Offline-First** | Everything works without internet; data never leaves the device |

## ⌨️ Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `/` or `⌘/Ctrl + K` | Open command palette (workspace-wide search) |
| `F` | Jump to the Focus timer |
| `C` | Jump to the Code (DSA prep) module |
| `↑↓` / `Enter` / `Esc` | Navigate results inside the palette |

## 🛠️ Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **TanStack Router + TanStack Start** — file-based routing, SSR-safe shell
- **Tailwind CSS v4** — design tokens and utilities
- **Zustand** — local-first store, persisted to `localStorage`
- **Zod** — runtime validation of every persisted record, schema-versioned migrations (v1 → v8)
- **Vitest** — 150+ unit & render tests for the domain/rule engines
- **Capacitor** — native Android shell, haptics, notifications, file save/share
- **GitHub Actions** — CI (typecheck · lint · tests · build) + signed APK releases

## 🏗️ Architecture

The app is a **local-first, schema-versioned data system** with a strict layering:

```
Routes (React, file-based)
   │  read/write via typed actions
Store (zustand + persist middleware)
   │  partialize → only plain data is persisted
Migrations (v1→v8, field-by-field salvage on corruption)
   │  validate
Schema (zod — single source of truth for every record)
   │  derive
Domain libs (progress, streaks, CGPA, focus, achievements, search…)
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
npm run test        # vitest suite (160+ tests)
npm run build       # production build (TanStack Start + Nitro)
```

> The app is **offline-first** and renders client-side (`ssr: false`), so all of
> your data lives in `localStorage`. Nothing leaves the device unless you
> explicitly export a backup.

## ✅ Testing

Core domain logic — migrations, backup/restore, the notification rule engine,
progress calculation, roadmap import, URL safety, streaks, CGPA math, focus
stats, achievements, quotes, search and the app store — is unit-tested with
Vitest. Tests live beside the code (`src/**/*.test.ts`) and run in Node by
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
