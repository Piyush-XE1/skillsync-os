import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Braces,
  Briefcase,
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Flame,
  FolderKanban,
  GraduationCap,
  LayoutGrid,
  Quote,
  Sparkles,
  StickyNote,
  Timer,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import type { WidgetId } from "@/lib/widgets";
import type { WidgetProps } from "./WidgetFrame";
import {
  AttendanceWidget,
  CareerWidget,
  CgpaWidget,
  DeepWorkWidget,
  ExpensesWidget,
  FocusTodayWidget,
  HabitsTodayWidget,
  MomentumWidget,
  RatingWidget,
  SolvedWidget,
  StreakWidget,
  XpWidget,
} from "./tiles";
import {
  AchievementsWidget,
  ContinueLearningWidget,
  HabitsWidget,
  NextBadgeWidget,
  NotesWidget,
  ProjectsWidget,
  QuickAccessWidget,
  QuoteWidget,
  RoadmapsWidget,
  TodayWidget,
  WeekReviewWidget,
} from "./panels";

/**
 * The widget registry: one render component + one icon per catalogue id.
 *
 * Adding a widget = add it to `WIDGET_DEFINITIONS` (lib/widgets.ts), write the
 * component, and register it here. Everything else — persistence, migrations,
 * the customize sheet, drag-to-reorder — picks it up automatically.
 */
export const WIDGET_COMPONENTS: Record<WidgetId, ComponentType<WidgetProps>> = {
  streak: StreakWidget,
  xp: XpWidget,
  focusToday: FocusTodayWidget,
  habitsToday: HabitsTodayWidget,
  momentum: MomentumWidget,
  deepWork: DeepWorkWidget,
  solved: SolvedWidget,
  expenses: ExpensesWidget,
  cgpa: CgpaWidget,
  career: CareerWidget,
  attendance: AttendanceWidget,
  rating: RatingWidget,
  continueLearning: ContinueLearningWidget,
  today: TodayWidget,
  habits: HabitsWidget,
  weekReview: WeekReviewWidget,
  quote: QuoteWidget,
  achievements: AchievementsWidget,
  nextBadge: NextBadgeWidget,
  quickAccess: QuickAccessWidget,
  roadmaps: RoadmapsWidget,
  projects: ProjectsWidget,
  notes: NotesWidget,
};

export const WIDGET_ICONS: Record<WidgetId, LucideIcon> = {
  streak: Flame,
  xp: Zap,
  focusToday: Timer,
  habitsToday: CheckCircle2,
  momentum: Activity,
  deepWork: Timer,
  solved: Braces,
  expenses: Wallet,
  cgpa: GraduationCap,
  career: Briefcase,
  attendance: CalendarCheck2,
  rating: Trophy,
  continueLearning: LayoutGrid,
  today: CalendarClock,
  habits: Sparkles,
  weekReview: CalendarRange,
  quote: Quote,
  achievements: Trophy,
  nextBadge: Trophy,
  quickAccess: LayoutGrid,
  roadmaps: GraduationCap,
  projects: FolderKanban,
  notes: StickyNote,
};
