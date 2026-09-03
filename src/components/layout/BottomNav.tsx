import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, FolderKanban, CalendarRange, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { useKeyboardOpen, useOverlayOpen } from "@/hooks/use-keyboard-inset";

type NavItem = {
  to: "/" | "/learn" | "/projects" | "/planner" | "/profile";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planner", label: "Planner", icon: CalendarRange },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const keyboardOpen = useKeyboardOpen();
  const overlayOpen = useOverlayOpen();
  const hidden = keyboardOpen || overlayOpen;

  return (
    <nav
      aria-label="Primary"
      aria-hidden={hidden}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),16px)] transition-all duration-200 ease-[var(--ease-out-soft)] lg:hidden",
        hidden && "pointer-events-none translate-y-[140%] opacity-0",
      )}
    >
      <div
        className={cn(
          "glass mx-4 flex w-full max-w-md items-center justify-between rounded-full px-2 py-2 shadow-[var(--shadow-float)]",
          hidden ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 transition-all duration-300",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
              aria-label={item.label}
              onClick={() => {
                if (!active) {
                  haptics.selection();
                  sound.select();
                }
              }}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                  active
                    ? "bg-white/[0.08] shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.08)]"
                    : "group-active:scale-90",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-tight transition-opacity",
                  active ? "opacity-100" : "opacity-60",
                )}
              >
                {item.label}
              </span>
              {active ? (
                <span className="absolute -bottom-0.5 h-[3px] w-[3px] rounded-full bg-[var(--primary)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
