# Changelog

All notable changes to SkillSync OS are documented here.

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
