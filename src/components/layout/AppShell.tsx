import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { useHapticPreferences } from "@/hooks/use-haptics";
import { useSoundPreferences } from "@/hooks/use-sound";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDemoRecovery } from "@/hooks/use-demo-recovery";
import { DemoBanner } from "./DemoBanner";

/**
 * Responsive application shell.
 * - `< lg` — mobile layout with the floating bottom navigation.
 * - `>= lg` — permanent collapsible sidebar, content in a centered container.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useHapticPreferences();
  useSoundPreferences();
  useKeyboardShortcuts();
  useDemoRecovery();
  // Automatic copies are handled by the single backup scheduler
  // (`startAutoScheduler`, mounted once in the root route). Doing it here per
  // screen meant every route serialised the whole workspace on a 1.5s debounce.
  return (
    <div className="relative flex min-h-[100dvh] w-full">
      <ScrollProgress />
      <DemoBanner />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="animate-float-in flex-1 pb-32 pt-[max(env(safe-area-inset-top),24px)] lg:pb-16 lg:pt-8">
          <div className="mx-auto w-full max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg lg:px-4 xl:max-w-screen-xl xl:px-8 2xl:max-w-screen-2xl">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

/**
 * Two-pixel scroll rail across the very top of the viewport — a cheap,
 * always-correct answer to "how much is left in this page". Written with rAF at
 * most once per frame, and animated with `transform` so it never triggers
 * layout while scrolling.
 */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${pct})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      ref={ref}
      style={{ transform: "scaleX(0)" }}
      className="gradient-primary pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left opacity-80"
    />
  );
}

export function AppFooter() {
  return (
    <footer className="mt-12 px-6 pb-4 text-center">
      <div
        className="text-[16px] leading-tight text-foreground/85"
        style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive" }}
      >
        Created with <span className="text-[#f472b6]">♥</span> by Piyush
      </div>
      <div
        className="mt-0.5 text-[13px] text-muted-foreground/80"
        style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive" }}
      >
        You gonna thank me for SkillSync
      </div>
    </footer>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  sticky = false,
  hero,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  sticky?: boolean;
  /** Optional summary statistics / visual rendered under the title. */
  hero?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "mb-6 px-6 lg:mb-8 lg:px-2",
        sticky &&
          "sticky top-0 z-50 bg-background/80 py-5 backdrop-blur-xl transition-colors lg:bg-transparent lg:backdrop-blur-none",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span aria-hidden className="gradient-primary h-1.5 w-1.5 rounded-full" />
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-balance text-fluid-title font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-fluid-body leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
      {hero ? <div className="mt-5">{hero}</div> : null}
      <div
        aria-hidden
        className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
      />
    </header>
  );
}
