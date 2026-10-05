import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { useKeyboardOpen, useOverlayOpen } from "@/hooks/use-keyboard-inset";
import { MODULE_CATALOG } from "@/lib/modules";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const modules = useAppStore((state) => state.preferences.modules);
  const openQuickCapture = useUiStore((state) => state.openQuickCapture);
  const keyboardOpen = useKeyboardOpen();
  const overlayOpen = useOverlayOpen();
  const hidden = keyboardOpen || overlayOpen;
  const enabledModules = MODULE_CATALOG.filter((module) => modules[module.key]);

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
          "glass mx-3 flex w-full max-w-lg items-center gap-1 rounded-[25px] px-2 py-1.5 shadow-[var(--shadow-float)]",
          hidden ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        <Link
          to="/"
          aria-label="Dashboard"
          aria-current={pathname === "/" ? "page" : undefined}
          onClick={() => pathname !== "/" && sound.select()}
          className={cn(
            "flex w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[18px] px-1 py-1.5 transition-colors",
            pathname === "/" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              pathname === "/" && "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]",
            )}
          >
            <LayoutDashboard
              className="h-[17px] w-[17px]"
              strokeWidth={pathname === "/" ? 2.2 : 1.75}
            />
          </span>
          <span className="max-w-full truncate text-[9px] font-medium">Home</span>
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
                  "flex w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[18px] px-1 py-1.5 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    active && "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.75} />
                </span>
                <span className="max-w-full truncate text-[9px] font-medium">
                  {module.navLabel}
                </span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Quick capture"
          title="Quick capture"
          onClick={() => {
            haptics.tap();
            sound.open();
            openQuickCapture();
          }}
          className="pressable gradient-primary flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
          <span className="-mt-0.5 text-[8px] font-semibold">Capture</span>
        </button>

        <Link
          to="/profile"
          aria-label="Profile"
          aria-current={
            pathname === "/profile" || pathname.startsWith("/profile/") ? "page" : undefined
          }
          onClick={() => !pathname.startsWith("/profile") && sound.select()}
          className={cn(
            "flex w-[50px] shrink-0 flex-col items-center gap-0.5 rounded-[18px] px-1 py-1.5 transition-colors",
            pathname === "/profile" || pathname.startsWith("/profile/")
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              pathname.startsWith("/profile") &&
                "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]",
            )}
          >
            <User className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <span className="text-[9px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
