# 📲 Home screen widgets

SkillSync ships **ten real Android home screen widgets** — not in-app cards.
They live next to your other apps, render from your on-device workspace, and
work with no internet and with SkillSync closed.

Add them from **Profile → Home screen** (one tap, Android 8+ opens the
launcher's pin sheet), or long-press an empty spot on the home screen →
**Widgets** → **SkillSync**.

| Widget | Default size | What it shows | Inline action |
| --- | --- | --- | --- |
| **Overview** | 4 × 4 | Today's habit ring, focus minutes, tasks, the habit list, today's tasks and the 7-day effort strip | Check habits / complete tasks |
| **Today** | 4 × 2 | `3 of 5 habits`, a completion meter, deep work, tasks and solves, plus the week strip | Each stat opens its module |
| **Habits** | 4 × 2 | Every habit with its live streak | Tap a row to check in |
| **Focus** | 2 × 2 | Today's deep work against the 100-minute goal and the focus streak | 15 / 25 / 50-minute starts |
| **Planner** | 4 × 2 | Today's tasks in time order, with priorities | Tap a task to complete it |
| **Spend** | 4 × 2 | Today's spend, the monthly budget meter and three quick amounts sized from your own spending | Log a spend in one tap, or open a small custom-amount sheet |
| **Aims** | 4 × 2 | The aims you are working on | Opens Aims |
| **Stats** | 2 × 2 | Solves today / this week, best streak, CGPA | Opens Analytics |
| **Daily quote** | 4 × 2 | The deterministic quote of the day | Opens Home |
| **Quick actions** | 4 × 1 | Six shortcuts: task, note, habit, spend, focus, analytics | Jumps into the module (spend opens the amount sheet) |

Every widget resizes. Habit, task and aim widgets show more rows as they get
taller (the row count is derived from `OPTION_APPWIDGET_MIN_HEIGHT`).

## How the data flows

```
zustand store ──▶ buildWidgetSnapshot() ──▶ native bridge ──▶ SharedPreferences
   (web)              (pure, tested)         widgetSync         (WidgetStore)
                                                                     │
                                                     RemoteViews ◀───┘
                                                     (WidgetRender)
```

1. `src/hooks/use-home-widgets.tsx` subscribes to the store and, after a
   ~1.2 s debounce, pushes a compact snapshot (`widgetSync`) whenever anything
   meaningful changes. It also pushes once on launch.
2. `SkillSyncNativePlugin.widgetSync` caches the snapshot and repaints every
   placed widget. Widgets never read the WebView and never invent data.
3. Each provider repaints from that cache: on add/resize, every 30 minutes
   (`updatePeriodMillis`), just after midnight, and after every sync.

## What is live (write) vs. navigation (read)

| Interaction | Where | What happens |
| --- | --- | --- |
| **Tick a habit** | Habits, Overview, Today's habit list | `habitLogs` entry added / removed for today |
| **Complete a task** | Planner, Overview | `done` + `doneAt` set on the planner task |
| **Log a spend (quick chip)** | Spend | Debit transaction, tag `Quick`, amount from your median spend |
| **Log a spend (custom)** | Spend `＋`, Quick actions `＋ Spend` | Small sheet: amount + Food/Transit/Study/Other → debit transaction |
| Everything else (stats, quote, aims, focus starts, quick links) | All widgets | Opens SkillSync on the relevant route |

Aims are deliberately read-only: they are statements of intent, not checklist
items. Focus "starts" open the timer rather than pretend to run it in the
background, because the session has to be timed by the app.

## Taps while the app is closed

Habit ticks, task completions and logged spends are the three write actions:

1. `WidgetActions` (a `BroadcastReceiver`) flips the row in the cached
   snapshot, so the widget reacts instantly.
2. The same change is appended to a small native queue (`WidgetStore`) — for a
   spend, the cached today/month totals move too so the widget reads correctly.
3. On the next resume — cold start, returning from the background, or the
   `skillsync:widget-actions` event `MainActivity` dispatches — the web app
   drains the queue (`nativeWidgetTakeActions`), replays it against the store
   (`planWidgetActions`, which is idempotent and drops taps for deleted habits
   or tasks), and pushes a fresh snapshot.

The result is a single source of truth: the workspace in `localStorage`, with
the widgets as a cache that always converges on it.

## Files

| Path | Role |
| --- | --- |
| `src/lib/home-widgets.ts` | Snapshot model, gallery catalogue, sparkline, action planner — all pure |
| `src/hooks/use-home-widgets.tsx` | Store ⇄ native synchronisation |
| `src/routes/profile.widgets.tsx` | Gallery: previews, sizes, one-tap add, sync status |
| `android/.../WidgetStore.java` | SharedPreferences cache + action queue |
| `android/.../WidgetRender.java` | Every `RemoteViews` layout, filled defensively |
| `android/.../WidgetSpecs.java` | The native catalogue (type → layout → provider) |
| `android/.../WidgetUpdater.java` | Repaint every placed widget |
| `android/.../WidgetActions.java` | Inline tap receiver (habit, task, spend) |
| `android/.../WidgetExpenseActivity.java` | The custom-amount sheet behind the Spend widget |
| `android/.../WidgetScheduler.java` | Midnight repaint |
| `android/app/src/main/res/layout/widget_*.xml` | One layout per widget + three row layouts |
| `android/app/src/main/res/xml/widget_*_info.xml` | Size, resize range and preview metadata |

## Adding a widget

1. Add a layout in `android/app/src/main/res/layout/` using the shared
   `widget_bg`, `widget_surface` and `widget_progress` drawables.
2. Add an `<appwidget-provider>` in `res/xml/`, a provider class extending
   `SkillSyncWidgetProvider`, and register it in `AndroidManifest.xml`.
3. Add a `WidgetSpecs.Spec` entry (type, label, layout, provider, cells) and a
   `render…` branch in `WidgetRender`.
4. Add the type to `HOME_WIDGETS` in `src/lib/home-widgets.ts` (the gallery) and
   a preview branch in `src/routes/profile.widgets.tsx`.
5. Add any new fields to `buildWidgetSnapshot` — and a test.

## Constraints worth knowing

- Expenses logged from a widget are deduplicated: a queued spend whose amount
  and timestamp already exist in the workspace is dropped, so draining the
  queue twice (after a crash) can never double-charge you.
- Widgets use classic `RemoteViews` (FrameLayout / LinearLayout / TextView /
  ProgressBar). No Compose, no Glance, no extra dependency — nothing to download
  and it works on every launcher.
- `ScrollView` is **not** allowed inside `RemoteViews`; lists are built by
  `addView`-ing a capped number of rows instead.
- Colours come from `res/values/colors.xml`, mirroring the app's Monograph Noir
  palette, so the widgets match the app while staying pure Android.
- No data leaves the device: the snapshot is a subset of what the app already
  keeps locally.
