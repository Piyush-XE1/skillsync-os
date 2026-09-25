/**
 * Demo workspace — a realistic final-year B.Tech CSE persona in one call.
 *
 * Purpose: the app should be able to *show itself off* in a viva, a screen
 * recording or a first-run tour without touching the visitor's real data. The
 * generator is deterministic (seeded PRNG, no `Math.random`, no `Date.now()`
 * spread beyond the injected `now`), so screenshots and tests are stable.
 *
 * Flow:
 *   1. `loadDemoWorkspace()` snapshots the real workspace into localStorage.
 *   2. The store adopts `createDemoData()`.
 *   3. `exitDemoWorkspace()` restores the snapshot byte-for-byte.
 *
 * The snapshot key doubles as the crash guard: if the app is closed mid-demo,
 * the next boot restores the real workspace (see `useDemoRecovery`).
 */

import { AppDataSchema, CURRENT_SCHEMA_VERSION, type AppData } from "./schema";
import { defaultWidgetLayout } from "./widgets";
import { createDefaultNotifications } from "./notifications/types";
import { dateISO } from "./date";

export const DEMO_SNAPSHOT_KEY = "skillsync:demo:snapshot";

/** Deterministic 32-bit PRNG — same demo everywhere, every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_SEED = 2026_0925;
/** Re-seeded at the top of every `createDemoData()` call, so two calls with the
 *  same clock produce byte-identical workspaces. */
let rng = mulberry32(DEMO_SEED);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const int = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

const DAY = 86_400_000;

function dayOffset(now: Date, days: number, hour = 9): Date {
  const d = new Date(now.getTime() + days * DAY);
  d.setHours(hour, int(0, 59), 0, 0);
  return d;
}

const iso = (d: Date) => dateISO(d);

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

const GOALS = [
  {
    id: "demo-goal-gym",
    title: "Gym 5× a week",
    emoji: "🏋️",
    note: "Show up even when you don't feel like it.",
  },
  {
    id: "demo-goal-junk",
    title: "No junk food",
    emoji: "🥗",
    note: "Eat for energy, not for boredom.",
  },
  {
    id: "demo-goal-cgpa",
    title: "Finish with a 9+ CGPA",
    emoji: "📚",
    note: "Six semesters down, two to go.",
  },
  { id: "demo-goal-fap", title: "No fap", emoji: "🔒", note: "Keep the energy. Keep the focus." },
  {
    id: "demo-goal-dsa",
    title: "500 DSA problems",
    emoji: "💻",
    note: "Consistency beats intensity.",
  },
  {
    id: "demo-goal-sleep",
    title: "Sleep by 11",
    emoji: "😴",
    note: "The cheapest performance upgrade there is.",
  },
];

const HABITS = [
  { id: "demo-habit-gym", title: "Workout", emoji: "🏋️", rate: 0.72 },
  { id: "demo-habit-read", title: "Read 20 pages", emoji: "📖", rate: 0.62 },
  { id: "demo-habit-dsa", title: "Solve 2 problems", emoji: "🧠", rate: 0.84 },
  { id: "demo-habit-water", title: "3L water", emoji: "💧", rate: 0.91 },
  { id: "demo-habit-sleep", title: "Lights out by 11", emoji: "😴", rate: 0.55 },
  { id: "demo-habit-journal", title: "Night journal", emoji: "✍️", rate: 0.48 },
];

const CHECKLIST = (items: Array<[string, boolean]>) =>
  items.map(([title, done], i) => ({ id: `c${i}-${title.length}`, title, done, createdAt: 0 }));

const topic = (
  id: string,
  title: string,
  done: boolean,
  subtopics: Array<[string, boolean]>,
  checklist: Array<[string, boolean]>,
  resources: Array<[string, string]> = [],
  notes = "",
) => ({
  id,
  title,
  done,
  notes,
  resources: resources.map(([label, url], i) => ({ id: `${id}-r${i}`, label, url })),
  subtopics: subtopics.map(([t, d], i) => ({
    id: `${id}-s${i}`,
    title: t,
    done: d,
    notes: "",
    resources: [],
    checklist: [],
    createdAt: 0,
  })),
  checklist: CHECKLIST(checklist),
  createdAt: 0,
  completedAt: done ? Date.now() - int(1, 40) * DAY : null,
});

function roadmaps() {
  return [
    {
      id: "demo-rm-dsa",
      title: "DSA Mastery",
      subtitle: "Pattern-first interview preparation",
      color: "#7c3aed",
      createdAt: 0,
      phases: [
        {
          id: "demo-dsa-p1",
          title: "Phase 1 · Foundations",
          createdAt: 0,
          topics: [
            topic(
              "demo-dsa-t1",
              "Arrays & Prefix Sums",
              true,
              [
                ["Kadane's algorithm", true],
                ["Sliding window", true],
              ],
              [
                ["Solve 10 easy", true],
                ["Solve 5 medium", true],
              ],
              [["Striver A2Z sheet", "https://takeuforward.org"]],
              "Sliding window is the workhorse for subarray problems.",
            ),
            topic(
              "demo-dsa-t2",
              "Strings & Hashing",
              true,
              [
                ["Anagram grouping", true],
                ["Rolling hash", false],
              ],
              [
                ["Solve 8 problems", true],
                ["Write notes", true],
              ],
            ),
            topic(
              "demo-dsa-t3",
              "Two Pointers",
              true,
              [["3Sum family", true]],
              [["Solve 6 problems", true]],
            ),
          ],
        },
        {
          id: "demo-dsa-p2",
          title: "Phase 2 · Core structures",
          createdAt: 0,
          topics: [
            topic(
              "demo-dsa-t4",
              "Binary Trees & BST",
              false,
              [
                ["Traversals", true],
                ["LCA", false],
              ],
              [
                ["Solve 12 problems", true],
                ["Revise recursion", true],
              ],
            ),
            topic(
              "demo-dsa-t5",
              "Graphs",
              false,
              [
                ["BFS/DFS", true],
                ["Dijkstra", true],
                ["Union-Find", false],
              ],
              [["Solve 15 problems", false]],
              [["Graph playlist", "https://youtube.com"]],
              "Dijkstra needs a priority queue — practise the boilerplate.",
            ),
            topic(
              "demo-dsa-t6",
              "Dynamic Programming",
              false,
              [
                ["1D DP", true],
                ["Knapsack", false],
                ["DP on trees", false],
              ],
              [["Solve 20 problems", false]],
            ),
          ],
        },
      ],
    },
    {
      id: "demo-rm-sd",
      title: "System Design",
      subtitle: "Scalable systems, one case study at a time",
      color: "#06b6d4",
      createdAt: 0,
      phases: [
        {
          id: "demo-sd-p1",
          title: "Phase 1 · Fundamentals",
          createdAt: 0,
          topics: [
            topic(
              "demo-sd-t1",
              "Scaling & Load Balancing",
              true,
              [
                ["Vertical vs horizontal", true],
                ["L4 vs L7", true],
              ],
              [["Read DDIA ch. 1", true]],
            ),
            topic(
              "demo-sd-t2",
              "Caching Strategies",
              true,
              [
                ["Cache-aside", true],
                ["Write-through", true],
              ],
              [["Read DDIA ch. 5", false]],
            ),
          ],
        },
        {
          id: "demo-sd-p2",
          title: "Phase 2 · Case studies",
          createdAt: 0,
          topics: [
            topic(
              "demo-sd-t3",
              "Design a URL shortener",
              true,
              [
                ["Base62 encoding", true],
                ["Rate limiting", true],
              ],
              [["Draw the diagram", true]],
            ),
            topic(
              "demo-sd-t4",
              "Design a chat system",
              false,
              [
                ["WebSockets", false],
                ["Fan-out", false],
              ],
              [["Notes", false]],
            ),
          ],
        },
      ],
    },
    {
      id: "demo-rm-fs",
      title: "Full-Stack Engineering",
      subtitle: "Ship real products, not tutorials",
      color: "#10b981",
      createdAt: 0,
      phases: [
        {
          id: "demo-fs-p1",
          title: "Phase 1 · Frontend",
          createdAt: 0,
          topics: [
            topic(
              "demo-fs-t1",
              "React 19 patterns",
              true,
              [
                ["Suspense", true],
                ["Server components", false],
              ],
              [["Rebuild a dashboard", true]],
            ),
            topic(
              "demo-fs-t2",
              "TypeScript discipline",
              true,
              [
                ["Generics", true],
                ["Zod at the boundary", true],
              ],
              [["Type a real API", true]],
            ),
          ],
        },
        {
          id: "demo-fs-p2",
          title: "Phase 2 · Backend & data",
          createdAt: 0,
          topics: [
            topic(
              "demo-fs-t3",
              "Postgres & indexing",
              false,
              [
                ["B-tree basics", true],
                ["Query plans", false],
              ],
              [["Index a slow query", false]],
            ),
            topic(
              "demo-fs-t4",
              "Auth & sessions",
              false,
              [["JWT vs session", true]],
              [["Ship login", false]],
            ),
          ],
        },
      ],
    },
  ];
}

function planner(now: Date) {
  const rows: Array<[string, number, boolean, "low" | "medium" | "high", string]> = [
    ["Revise OS Unit 3 — deadlocks", 0, true, "high", "10:00"],
    ["Solve 3 DP problems", 0, true, "high", "16:00"],
    ["Submit DBMS assignment", 0, false, "high", "21:00"],
    ["Mock interview with Rohan", 1, false, "medium", "19:30"],
    ["Finish System Design case study", 1, false, "medium", ""],
    ["Update resume for on-campus drive", 2, false, "high", ""],
    ["Gym + 30 min cardio", 2, false, "low", "07:00"],
    ["Prepare 5 HR answers", 3, false, "medium", ""],
    ["Weekly review & next-week plan", 4, false, "low", "20:00"],
    ["Back up the workspace", -1, true, "low", ""],
  ];
  return rows.map(([title, offset, done, priority, time], i) => ({
    id: `demo-task-${i}`,
    title,
    date: iso(dayOffset(now, offset)),
    time,
    done,
    priority,
    doneAt: done ? dayOffset(now, offset, 18).getTime() : null,
    createdAt: dayOffset(now, offset - 3).getTime(),
  }));
}

function projects() {
  return [
    {
      id: "demo-pr-1",
      title: "SkillSync OS",
      description:
        "Offline-first personal growth OS — this app. 20-widget dashboard, 12-version schema migrations, zero-dependency motion system.",
      status: "active",
      progress: 84,
      deadline: iso(new Date(Date.now() + 21 * DAY)),
      techStack: ["React 19", "TypeScript", "TanStack Start", "Zustand", "Zod", "Tailwind v4"],
      tasks: [
        { id: "demo-prt-1", title: "Widget grid + drag & drop", done: true },
        { id: "demo-prt-2", title: "Schema migrations v1 → v12", done: true },
        { id: "demo-prt-3", title: "Demo workspace + showcase page", done: false },
        { id: "demo-prt-4", title: "Final report + viva slides", done: false },
      ],
      notes: "The viva demo runs from this page.",
      githubUrl: "https://github.com/Piyush-XE1/skillsync-os",
      createdAt: 0,
    },
    {
      id: "demo-pr-2",
      title: "CampusRide",
      description:
        "Carpool matching for students commuting to campus, with route clustering and a live seat map.",
      status: "done",
      progress: 100,
      deadline: null,
      techStack: ["Flutter", "Node.js", "MongoDB", "Socket.IO"],
      tasks: [
        { id: "demo-prt-5", title: "Auth + college email OTP", done: true },
        { id: "demo-prt-6", title: "Route clustering", done: true },
      ],
      notes: "Won 2nd place at the department hackathon.",
      githubUrl: "",
      createdAt: 0,
    },
    {
      id: "demo-pr-3",
      title: "Sign Language Translator",
      description:
        "Real-time ISL gesture recognition — MediaPipe landmarks into a small transformer classifier.",
      status: "active",
      progress: 46,
      deadline: iso(new Date(Date.now() + 60 * DAY)),
      techStack: ["Python", "PyTorch", "MediaPipe", "OpenCV"],
      tasks: [
        { id: "demo-prt-7", title: "Dataset collection (200 signs)", done: true },
        { id: "demo-prt-8", title: "Train baseline CNN", done: true },
        { id: "demo-prt-9", title: "Deploy demo on Raspberry Pi", done: false },
      ],
      notes: "Major project — guide: Dr. Meenakshi.",
      githubUrl: "",
      createdAt: 0,
    },
  ];
}

function notes(now: Date) {
  const rows: Array<[string, string, string[]]> = [
    [
      "DP patterns worth memorising",
      "1. Take / skip (knapsack family)\n2. Longest increasing subsequence in O(n log n)\n3. Interval DP — go from the smallest interval up\n4. Bitmask DP for n ≤ 20\n5. Digit DP when the constraint is a range of numbers",
      ["dsa", "revision"],
    ],
    [
      "OS — deadlock checklist",
      "Four conditions for deadlock: mutual exclusion, hold & wait, no preemption, circular wait.\nBreak any one of them and deadlock is impossible.\nBanker's algorithm = safe sequence check.",
      ["semester-7", "exam"],
    ],
    [
      "Placement prep log",
      "Week 1: aptitude + resume\nWeek 2: 40 medium DSA problems\nWeek 3: 2 system design case studies\nWeek 4: mock interviews with Rohan (Tue/Thu)",
      ["placement"],
    ],
    [
      "Final year project ideas",
      "- Sign language translator (chosen)\n- Crop disease detector with on-device inference\n- Campus energy dashboard using smart-meter data",
      ["final-year"],
    ],
  ];
  return rows.map(([title, body, tags], i) => ({
    id: `demo-note-${i}`,
    title,
    body,
    tags,
    pinned: i === 0,
    linkedTo: null,
    createdAt: dayOffset(now, -(i + 2) * 3).getTime(),
    updatedAt: now.getTime() - i * DAY,
  }));
}

const PROBLEM_NAMES = [
  "Two Sum",
  "Best Time to Buy and Sell Stock",
  "Contains Duplicate",
  "Product of Array Except Self",
  "Maximum Subarray",
  "3Sum",
  "Container With Most Water",
  "Merge Intervals",
  "Group Anagrams",
  "Longest Substring Without Repeating Characters",
  "Valid Parentheses",
  "Min Stack",
  "Binary Search",
  "Search in Rotated Sorted Array",
  "Koko Eating Bananas",
  "Merge k Sorted Lists",
  "Reverse Linked List",
  "Linked List Cycle",
  "LRU Cache",
  "Invert Binary Tree",
  "Diameter of Binary Tree",
  "Balanced Binary Tree",
  "Level Order Traversal",
  "Validate BST",
  "Kth Smallest in BST",
  "Number of Islands",
  "Clone Graph",
  "Course Schedule",
  "Pacific Atlantic Water Flow",
  "Word Ladder",
  "Network Delay Time",
  "Cheapest Flights Within K Stops",
  "Coin Change",
  "Longest Increasing Subsequence",
  "Word Break",
  "House Robber",
  "Unique Paths",
  "Edit Distance",
  "Target Sum",
  "Partition Equal Subset Sum",
  "Jump Game",
  "Gas Station",
];

const TAGS = [
  "array",
  "dp",
  "graph",
  "tree",
  "hashmap",
  "two-pointers",
  "greedy",
  "binary-search",
  "sliding-window",
  "backtracking",
];

function coding(now: Date) {
  const problems = Array.from({ length: 148 }, (_, i) => {
    const offset = -int(0, 118);
    const difficulty = rng() < 0.34 ? "easy" : rng() < 0.72 ? "medium" : "hard";
    return {
      id: `demo-prob-${i}`,
      title: pick(PROBLEM_NAMES),
      platform:
        rng() < 0.68
          ? "leetcode"
          : rng() < 0.5
            ? "codeforces"
            : pick(["codechef", "gfg", "hackerrank"]),
      difficulty,
      tags: [pick(TAGS), pick(TAGS)].filter((t, idx, arr) => arr.indexOf(t) === idx),
      url: "",
      solvedAt: dayOffset(now, offset, int(10, 23)).getTime(),
      notes: rng() < 0.25 ? "Revisit — the optimal approach was non-obvious." : "",
      timeComplexity: pick(["O(n)", "O(n log n)", "O(n²)", "O(V + E)"]),
      spaceComplexity: pick(["O(1)", "O(n)", "O(n) memo"]),
    };
  }).sort((a, b) => a.solvedAt - b.solvedAt);

  const ratingHistory = Array.from({ length: 14 }, (_, i) => ({
    at: now.getTime() - (13 - i) * 9 * DAY,
    rating: 1380 + i * 36 + int(-18, 22),
  }));

  return { problems, rating: 1842, maxRating: 1876, ratingHistory };
}

const CGPA_GRADES = ["O", "A+", "A", "A+", "O", "A", "A+", "B+"] as const;

function cgpa() {
  const subjectsBySem: string[][] = [
    [
      "Engineering Maths I",
      "Physics",
      "C Programming",
      "Engineering Graphics",
      "Basic Electronics",
    ],
    [
      "Engineering Maths II",
      "Chemistry",
      "Data Structures",
      "Digital Logic",
      "Communication Skills",
    ],
    [
      "Discrete Maths",
      "Object Oriented Programming",
      "Computer Organisation",
      "Probability & Statistics",
      "Economics",
    ],
    [
      "Operating Systems",
      "DBMS",
      "Design & Analysis of Algorithms",
      "Theory of Computation",
      "Environmental Science",
    ],
    [
      "Computer Networks",
      "Software Engineering",
      "Compiler Design",
      "Artificial Intelligence",
      "Constitution of India",
    ],
    [
      "Machine Learning",
      "Web Technologies",
      "Cloud Computing",
      "Computer Graphics",
      "Open Elective",
    ],
  ];
  return {
    semesters: subjectsBySem.map((names, i) => ({
      id: `demo-sem-${i + 1}`,
      number: i + 1,
      subjects: names.map((name, j) => ({
        id: `demo-sem-${i + 1}-sub-${j}`,
        name,
        code: `CS-${i + 1}0${j + 1}`,
        credits: j === 3 ? 4 : 3,
        grade: j < 3 ? CGPA_GRADES[(i + j) % 4] : CGPA_GRADES[(i + j) % 8],
      })),
    })),
  };
}

function career(now: Date) {
  const rows: Array<[string, string, string, string, number, number]> = [
    ["Google", "SWE Intern", "Bangalore", "rejected", -46, 0],
    ["Microsoft", "SDE Intern", "Hyderabad", "interview", -28, 3],
    ["Amazon", "SDE-1 (Campus)", "Bangalore", "oa", -12, 1],
    ["Swiggy", "SDE-1", "Bangalore", "offer", -34, 4],
    ["Razorpay", "Backend Intern", "Remote", "referral", -9, 0],
    ["De Shaw", "Software Engineer", "Hyderabad", "interview", -21, 2],
    ["PhonePe", "SDE Intern", "Pune", "applied", -5, 0],
    ["Zoho", "Member Technical Staff", "Chennai", "saved", -2, 0],
  ];
  const roundNames = ["Online Assessment", "Technical Round 1", "Technical Round 2", "HR Round"];
  return rows.map(([company, role, location, status, appliedDays, rounds], i) => ({
    id: `demo-job-${i}`,
    company,
    role,
    location,
    status,
    appliedAt: dayOffset(now, appliedDays).getTime(),
    deadline: null,
    referral: status === "referral" ? "Senior — Ananya (2019 batch)" : "",
    link: "",
    salary: status === "offer" ? "₹18 LPA" : "",
    notes: status === "offer" ? "Offer in hand — negotiate the joining date." : "",
    rounds: Array.from({ length: rounds }, (_, r) => ({
      id: `demo-job-${i}-r${r}`,
      name: roundNames[r] ?? `Round ${r + 1}`,
      date: dayOffset(now, appliedDays + (r + 1) * 3).getTime(),
      type: r === 0 ? "takehome" : "virtual",
      outcome: r === rounds - 1 && status === "interview" ? "pending" : "cleared",
      notes: "",
    })),
  }));
}

function focusSessions(now: Date) {
  const out: Array<Record<string, unknown>> = [];
  for (let offset = -20; offset <= 0; offset++) {
    const count = offset === 0 ? 2 : int(1, 5);
    for (let s = 0; s < count; s++) {
      out.push({
        id: `demo-focus-${offset}-${s}`,
        startedAt: dayOffset(now, offset, int(7, 22)).getTime(),
        minutes: pick([25, 25, 30, 45, 50]),
        mode: "focus",
        task: pick([
          "DSA problem set",
          "System design reading",
          "DBMS assignment",
          "Project — SkillSync",
          "Placement prep",
        ]),
      });
    }
  }
  return out;
}

const attendance = () => ({
  subjects: [
    {
      id: "demo-att-1",
      semester: 7,
      name: "Compiler Design",
      faculty: "Dr. Rao",
      minRequired: 75,
      present: 34,
      absent: 5,
      createdAt: 0,
    },
    {
      id: "demo-att-2",
      semester: 7,
      name: "Machine Learning",
      faculty: "Dr. Meenakshi",
      minRequired: 75,
      present: 31,
      absent: 8,
      createdAt: 0,
    },
    {
      id: "demo-att-3",
      semester: 7,
      name: "Cloud Computing",
      faculty: "Prof. Iyer",
      minRequired: 75,
      present: 36,
      absent: 2,
      createdAt: 0,
    },
    {
      id: "demo-att-4",
      semester: 7,
      name: "Computer Graphics",
      faculty: "Dr. Kulkarni",
      minRequired: 70,
      present: 27,
      absent: 11,
      createdAt: 0,
    },
    {
      id: "demo-att-5",
      semester: 7,
      name: "Open Elective — Finance",
      faculty: "Prof. Sharma",
      minRequired: 60,
      present: 22,
      absent: 3,
      createdAt: 0,
    },
  ],
});

function expenses(now: Date) {
  const rows: Array<[string, number, "credit" | "debit", string]> = [
    ["Hostel mess", 4200, "debit", "monthly"],
    ["Pocket money", 8000, "credit", "family"],
    ["Campus canteen", 140, "debit", "food"],
    ["DSA course", 1299, "debit", "learning"],
    ["Bus pass", 620, "debit", "travel"],
    ["Printouts", 90, "debit", "college"],
    ["Stationery", 210, "debit", "college"],
    ["Freelance — landing page", 5000, "credit", "side-income"],
    ["Internet recharge", 349, "debit", "utilities"],
    ["Movie with friends", 380, "debit", "fun"],
    ["Lab coat", 450, "debit", "college"],
    ["Books — DDIA", 1150, "debit", "learning"],
  ];
  return {
    transactions: rows.map(([title, amount, type, tag], i) => ({
      id: `demo-txn-${i}`,
      title,
      description: "",
      amount,
      type,
      tags: [tag],
      at: dayOffset(now, -i * 2).getTime(),
      position: i,
      updatedAt: 0,
    })),
  };
}

function notifications(now: Date) {
  const base = createDefaultNotifications();
  return {
    ...base,
    items: [
      {
        id: "demo-notif-1",
        createdAt: now.getTime() - 2 * 3_600_000,
        category: "planner",
        title: "3 tasks due today",
        body: "OS revision is still open — it is the highest priority one.",
        read: false,
        priority: "high",
        action: { kind: "route", to: "/planner" },
        delivered: true,
        origin: "rule",
      },
      {
        id: "demo-notif-2",
        createdAt: now.getTime() - 26 * 3_600_000,
        category: "habits",
        title: "Workout streak: 6 days",
        body: "One more day and it is a clean week.",
        read: false,
        priority: "normal",
        action: { kind: "route", to: "/habits" },
        delivered: true,
        origin: "rule",
      },
      {
        id: "demo-notif-3",
        createdAt: now.getTime() - 2 * DAY,
        category: "learn",
        title: "System Design is 62% done",
        body: "Two case studies left before the placement drive.",
        read: true,
        priority: "normal",
        action: { kind: "route", to: "/learn" },
        delivered: false,
        origin: "rule",
      },
      {
        id: "demo-notif-4",
        createdAt: now.getTime() - 5 * DAY,
        category: "weeklySummary",
        title: "Last week: 74% habit consistency",
        body: "12 focus sessions, 18 problems solved, 4 active days.",
        read: true,
        priority: "low",
        action: { kind: "route", to: "/review" },
        delivered: false,
        origin: "rule",
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Generator
 * ------------------------------------------------------------------ */

export function createDemoData(now: Date = new Date()): AppData {
  rng = mulberry32(DEMO_SEED);
  const raw = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: { name: "Aditya Sharma", avatar: "" },
    preferences: {
      notifications: true,
      developerMode: false,
      modules: {
        attendance: true,
        expenses: true,
        focus: true,
        cgpa: true,
        coding: true,
        career: true,
      },
      background: "aurora",
      haptics: true,
      hapticIntensity: "standard",
      sound: true,
      soundVolume: 0.5,
    },
    goals: GOALS.map((g) => ({ ...g, note: g.note ?? "", createdAt: 0 })),
    habits: HABITS.map((h) => ({
      id: h.id,
      title: h.title,
      emoji: h.emoji,
      createdAt: 0,
      startDate: iso(dayOffset(now, -120)),
    })),
    habitLogs: HABITS.flatMap((habit) =>
      Array.from({ length: 120 }, (_, i) => i).flatMap((offset) => {
        const d = dayOffset(now, -offset);
        const weekendPenalty = [0, 6].includes(d.getDay()) ? 0.14 : 0;
        return rng() < habit.rate - weekendPenalty ? [{ habitId: habit.id, date: iso(d) }] : [];
      }),
    ),
    roadmaps: roadmaps(),
    planner: planner(now),
    projects: projects(),
    notes: notes(now),
    coding: coding(now),
    cgpa: cgpa(),
    career: { applications: career(now) },
    focus: {
      sessions: focusSessions(now),
      settings: {
        workMin: 25,
        breakMin: 5,
        longBreakMin: 15,
        longBreakEvery: 4,
        autoStartBreaks: false,
        autoStartFocus: false,
        sound: true,
      },
    },
    attendance: attendance(),
    expenses: expenses(now),
    notifications: notifications(now),
    widgets: defaultWidgetLayout(),
  };

  return AppDataSchema.parse(raw);
}

/* ------------------------------------------------------------------ *
 * Snapshot handling — never lose the real workspace
 * ------------------------------------------------------------------ */

export function saveDemoSnapshot(data: AppData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(DEMO_SNAPSHOT_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readDemoSnapshot(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SNAPSHOT_KEY);
    if (!raw) return null;
    return AppDataSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearDemoSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_SNAPSHOT_KEY);
  } catch {
    /* storage blocked — nothing to clear */
  }
}
