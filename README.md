# ⚡ SkillSync OS

> **Your personal operating system for learning, building, planning, and becoming better.**

SkillSync OS brings **learning, projects, planning, habits, notes, reminders, and personal progress** into one unified productivity system.

Built with a **premium futuristic UI**, animated Aurora backgrounds, offline-first architecture, and a dedicated Android experience.

## ✨ Features

- 📊 **Dashboard** — Your central productivity overview
- 🎓 **Learn** — Structured learning roadmaps & progress
- 🚀 **Projects** — Manage and track things you're building
- 📅 **Planner** — Turn goals into actionable plans
- 🔥 **Habits** — Build consistency and track routines
- 📝 **Notes** — Local-first notes with autosave
- 🔔 **Notifications** — Reminders, alerts & weekly digest
- 📱 **Android App** — Native Android experience with haptics & system navigation
- 🌌 **Aurora UI** — Animated futuristic visual environment
- ☀️ **Light Theme** — Minimalist alternative to the Aurora dark theme
- ⚡ **Offline-First** — Core functionality designed to work without internet

## 🎨 Design

SkillSync OS uses a futuristic yet minimal visual language built around:

**Deep dark surfaces · Aurora lighting · Purple/Blue/Cyan gradients · Glassmorphism · Smooth motion**

The app also includes a dedicated minimalist Light theme rather than simply reversing the Dark theme.

## 🛠️ Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **TanStack Router + TanStack Start** — file-based routing, SSR-safe shell, server entry
- **Tailwind CSS v4** — design tokens and utilities
- **Zustand** — local-first state, persisted to `localStorage`
- **Zod** — runtime validation of every persisted record and backup/import payload
- **Vitest** — unit tests for the domain/rule engine
- **Capacitor** — native Android shell, haptics, notifications, file save/share

## 🚀 Getting started

```bash
# Install dependencies (bun is the project's package manager)
npm install         # or: bun install

# Start the dev server (hot reload)
npm run dev         # or: bun run dev

# Typecheck
npm run typecheck   # or: bun run typecheck

# Lint
npm run lint        # or: bun run lint

# Run the test suite
npm run test        # or: bun run test

# Production build
npm run build       # or: bun run build
```

> The app is **offline-first** and renders client-side (`ssr: false`), so all of
> your data lives in `localStorage`. Nothing leaves the device unless you
> explicitly export a backup.

## ✅ Testing

The core domain logic — migrations, backup/restore, the notification rule
engine, progress calculation, roadmap import, URL safety, and the app store —
is unit-tested with [Vitest](https://vitest.dev/). Tests live beside the code
(`src/**/*.test.ts`) and run in Node by default; browser-only tests (the store,
`localStorage` state) opt into jsdom with a `// @vitest-environment jsdom`
comment.

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

### Brand

**SKILLSYNC OS**

**ALIGN • CONNECT • ELEVATE**

The primary logo is a standalone S-shaped symbol representing synchronization, connection, alignment, and continuous growth.

## 🧠 Philosophy

SkillSync OS is built around a simple loop:

**Learn → Plan → Build → Track → Reflect → Improve**

Instead of using separate tools for every part of personal development, SkillSync aims to bring the entire system together in one place.

## 🗺️ Roadmap

- [x] Core productivity system
- [x] Dashboard
- [x] Learn
- [x] Projects
- [x] Planner
- [x] Habits
- [x] Notes
- [x] Local notifications
- [x] Android APK
- [x] Android back navigation
- [x] Native haptics
- [x] Aurora UI
- [x] Light theme
- [x] Custom app opening experience
- [x] Automated APK builds
- [x] Unit test suite (Vitest)
- [x] Automated CI (typecheck · lint · tests · build)
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
