# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Module map

| Module | Routes |
| --- | --- |
| Dashboard | `index.tsx` |
| Learn | `learn.tsx` · `learn.index.tsx` · `learn.$roadmapId.tsx` · `learn.$roadmapId_.$topicId.tsx` |
| Focus (Pomodoro) | `focus.tsx` |
| CGPA tracker | `cgpa.tsx` |
| Resume builder | `resume.tsx` |
| Command palette | `search.tsx` |
| Projects | `projects.tsx` |
| Planner | `planner.tsx` |
| Habits | `habits.tsx` · `habits.index.tsx` · `habits.$habitId.tsx` |
| Notes | `notes.tsx` · `notes.index.tsx` · `notes.$noteId.tsx` · `notes.$noteId_.edit.tsx` |
| Analytics | `analytics.tsx` |
| Attendance | `attendance.tsx` · `attendance.index.tsx` · `attendance.$semester.tsx` |
| Expenses | `expenses.tsx` · `expenses.index.tsx` |
| Code (DSA prep) | `coding.tsx` · `coding.index.tsx` |
| Career (placements) | `career.tsx` · `career.index.tsx` |
| Profile | `profile.tsx` · `profile.index.tsx` · `profile.backup.tsx` · `profile.modules.tsx` · `profile.notifications.tsx` · `profile.system.tsx` |

New feature routes follow the same file-based conventions above; logic lives in
`src/lib` with tests beside it, and UI state in the zustand store.
