import {
  Bell,
  CalendarRange,
  ChartLine,
  Flame,
  FolderKanban,
  GraduationCap,
  Save,
  School,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";

const ICONS: Record<string, typeof Bell> = {
  bell: Bell,
  "graduation-cap": GraduationCap,
  flame: Flame,
  school: School,
  "calendar-range": CalendarRange,
  "folder-kanban": FolderKanban,
  wallet: Wallet,
  save: Save,
  trophy: Trophy,
  "chart-line": ChartLine,
  sparkles: Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Bell;
  return <Icon className={className} strokeWidth={1.75} />;
}
