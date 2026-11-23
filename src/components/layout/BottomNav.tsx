import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { useKeyboardOpen, useOverlayOpen } from "@/hooks/use-keyboard-inset";
import { orderedModules } from "@/lib/modules";
import { useAppStore } from "@/store/useAppStore";

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const modules = useAppStore((state) => state.preferences.modules);
  const moduleOrder = useAppStore((state) => state.preferences.moduleOrder);
  const keyboardOpen = useKeyboardOpen();
  const overlayOpen = useOverlayOpen();
  const hidden = keyboardOpen || overlayOpen;
  const enabledModules = orderedModules(modules, moduleOrder);

  return (
    <nav
      aria-label="Primary"
      aria-hidden={hidden}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),10px)] transition-all duration-200 ease-[var(--ease-out-soft)] lg:hidden",
        hidden && "translate-y-[140%] opacity-0",
      )}
    >
      <div
        className={cn(
          "card-elevated mx-3 flex w-full max-w-lg items-center gap-1 rounded-[9px] px-2 py-2",
          hidden ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        <Link
          to="/"
          aria-label="Dashboard"
          aria-current={pathname === "/" ? "page" : undefined}
          onClick={() => pathname !== "/" && sound.select()}
          className={cn(
            "flex w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[5px] px-1 py-1 transition-colors",
            pathname === "/" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[4px] border border-transparent",
              pathname === "/" && "border-primary bg-primary text-primary-foreground",
            )}
          >
            <LayoutDashboard
              className="h-[17px] w-[17px]"
              strokeWidth={pathname === "/" ? 2.2 : 1.75}
            />
          </span>
          <span className="font-numerical max-w-full truncate text-[9px] font-medium uppercase tracking-[0.06em]">
            Home
          </span>
        </Link>

        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain">
          {enabledModules.map((module) => {
            const active = pathname === module.route || pathname.startsWith(`${module.route}/`);
            const Icon = module.icon;
            return (
              <Link
                key={module.key}
                to={module.route}
                aria-label={module.navLabel}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!active) {
                    haptics.selection();
                    sound.select();
                  }
                }}
                className={cn(
                  "flex w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[5px] px-1 py-1 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[4px] border border-transparent",
                    active && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.75} />
                </span>
                <span className="font-numerical max-w-full truncate text-[9px] font-medium uppercase tracking-[0.06em]">
                  {module.navLabel}
                </span>
              </Link>
            );
          })}
          <Link
            to="/people"
            aria-label="People I Met"
            aria-current={pathname === "/people" ? "page" : undefined}
            onClick={() => pathname !== "/people" && sound.select()}
            className={cn(
              "flex w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[5px] px-1 py-1 transition-colors",
              pathname === "/people" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[4px] border border-transparent",
                pathname === "/people" && "border-primary bg-primary text-primary-foreground",
              )}
            >
              <Users
                className="h-[17px] w-[17px]"
                strokeWidth={pathname === "/people" ? 2.2 : 1.75}
              />
            </span>
            <span className="font-numerical max-w-full truncate text-[9px] font-medium uppercase tracking-[0.06em]">
              People
            </span>
          </Link>
        </div>

        <Link
          to="/profile"
          aria-label="Profile"
          aria-current={
            pathname === "/profile" || pathname.startsWith("/profile/") ? "page" : undefined
          }
          onClick={() => !pathname.startsWith("/profile") && sound.select()}
          className={cn(
            "flex w-[50px] shrink-0 flex-col items-center gap-0.5 rounded-[5px] px-1 py-1 transition-colors",
            pathname === "/profile" || pathname.startsWith("/profile/")
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[4px] border border-transparent",
              pathname.startsWith("/profile") &&
                "border-primary bg-primary text-primary-foreground",
            )}
          >
            <User className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.06em]">
            Profile
          </span>
        </Link>
      </div>
    </nav>
  );
}
