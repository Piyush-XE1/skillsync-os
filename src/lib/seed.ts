import type { AppData, Roadmap, Habit, Phase, Topic } from "./schema";
import { CURRENT_SCHEMA_VERSION } from "./schema";
import { createDefaultNotifications } from "./notifications/types";
import { createDefaultFocusSettings } from "./schema";
const SEED_CREATED_AT = 1_704_067_200_000;
const SEED_START_DATE = "2024-01-01";

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function makeTopic(roadmapId: string, phaseId: string, title: string, index: number): Topic {
  return {
    id: `${roadmapId}-${phaseId}-topic-${index + 1}-${slug(title)}`,
    title,
    done: false,
    notes: "",
    resources: [],
    subtopics: [],
    checklist: [],
    createdAt: SEED_CREATED_AT,
    completedAt: null,
  };
}

function makePhase(roadmapId: string, title: string, topics: string[], index: number): Phase {
  const phaseId = `phase-${index + 1}-${slug(title)}`;
  return {
    id: `${roadmapId}-${phaseId}`,
    title,
    topics: topics.map((topic, topicIndex) => makeTopic(roadmapId, phaseId, topic, topicIndex)),
    createdAt: SEED_CREATED_AT,
  };
}

function makeRoadmap(
  id: string,
  title: string,
  subtitle: string,
  color: string,
  phaseGroups: { title: string; topics: string[] }[] = [],
): Roadmap {
  return {
    id,
    title,
    subtitle,
    color,
    phases: phaseGroups.map((phase, index) => makePhase(id, phase.title, phase.topics, index)),
    createdAt: SEED_CREATED_AT,
  };
}

function makeHabit(id: string, title: string, emoji: string): Habit {
  return { id, title, emoji, createdAt: SEED_CREATED_AT, startDate: SEED_START_DATE };
}

export function createInitialData(): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    roadmaps: [
      makeRoadmap("roadmap-python", "Python", "Foundations → Mastery", "#7c3aed", [
        {
          title: "Foundations",
          topics: [
            "Syntax & variables",
            "Data types & operators",
            "Control flow",
            "Functions & scope",
          ],
        },
        {
          title: "Core",
          topics: [
            "Collections (list, dict, set, tuple)",
            "Comprehensions",
            "Modules & packages",
            "File I/O",
            "Errors & exceptions",
          ],
        },
        {
          title: "Intermediate",
          topics: [
            "OOP: classes & inheritance",
            "Iterators & generators",
            "Decorators",
            "Context managers",
            "Typing & dataclasses",
          ],
        },
        {
          title: "Advanced",
          topics: [
            "Async & concurrency",
            "Testing (pytest)",
            "Packaging & virtualenvs",
            "Performance & profiling",
          ],
        },
      ]),
      makeRoadmap(
        "roadmap-ai-machine-learning",
        "AI / Machine Learning",
        "Math · Models · Systems",
        "#2563eb",
        [
          {
            title: "Math foundations",
            topics: ["Linear algebra", "Probability & statistics", "Calculus for ML"],
          },
          {
            title: "Classical ML",
            topics: [
              "Regression & classification",
              "Trees & ensembles",
              "Clustering & PCA",
              "Model evaluation",
            ],
          },
          {
            title: "Deep learning",
            topics: [
              "Neural networks basics",
              "CNNs",
              "RNNs & transformers",
              "Training tricks & regularization",
            ],
          },
          {
            title: "LLMs & applied AI",
            topics: [
              "Prompting & fine-tuning",
              "Embeddings & RAG",
              "Agents & tools",
              "Evaluation & safety",
            ],
          },
        ],
      ),
      makeRoadmap("roadmap-dsa", "DSA", "Patterns · Problems", "#18181b", [
        {
          title: "Foundations",
          topics: ["Big-O & complexity", "Arrays & strings", "Hash maps & sets"],
        },
        {
          title: "Linear structures",
          topics: ["Two pointers", "Sliding window", "Stacks & queues", "Linked lists"],
        },
        { title: "Non-linear", topics: ["Trees & BSTs", "Heaps", "Graphs (BFS / DFS)", "Tries"] },
        {
          title: "Algorithms",
          topics: ["Binary search", "Recursion & backtracking", "Greedy", "Dynamic programming"],
        },
      ]),
      makeRoadmap(
        "roadmap-web-development",
        "Web Development",
        "Frontend · Backend · Infra",
        "#db2777",
        [
          {
            title: "Frontend",
            topics: [
              "HTML & semantic markup",
              "CSS & responsive design",
              "JavaScript essentials",
              "React fundamentals",
            ],
          },
          {
            title: "Backend",
            topics: ["HTTP & REST", "Databases & SQL", "Auth & sessions", "APIs"],
          },
          {
            title: "Infra & delivery",
            topics: ["Git & workflows", "CI/CD", "Deployment & hosting", "Observability"],
          },
        ],
      ),
    ],
    notes: [],
    projects: [],
    planner: [],
    habits: [
      makeHabit("habit-sleep", "Sleep", "😴"),
      makeHabit("habit-workout", "Workout", "🏋️"),
      makeHabit("habit-reading", "Reading", "📖"),
      makeHabit("habit-coding", "Coding", "💻"),
      makeHabit("habit-walking", "Walking", "🚶"),
      makeHabit("habit-meditation", "Meditation", "🧘"),
    ],
    habitLogs: [],
    profile: { name: "Learner", avatar: "" },
    preferences: {
      notifications: true,
      developerMode: false,
      modules: { attendance: false, expenses: false, focus: true, cgpa: true, resume: true },
      background: "aurora",
      haptics: true,
      hapticIntensity: "standard",
    },
    stats: {
      xp: 0,
      level: 1,
      streak: 0,
      lastActive: "",
      totalXp: 0,
      joinedAt: Date.now(),
      achievements: [],
    },
    attendance: { subjects: [] },
    expenses: { transactions: [] },
    focus: { sessions: [], settings: createDefaultFocusSettings() },
    cgpa: { semesters: [] },
    resume: {
      name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      github: "",
      linkedin: "",
      summary: "",
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
    },
    notifications: createDefaultNotifications(),
  };
}
