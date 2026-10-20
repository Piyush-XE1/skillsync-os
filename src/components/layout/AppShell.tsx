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
          <div className="editorial-frame mx-auto w-full max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg lg:px-4 xl:max-w-screen-xl xl:px-8 2xl:max-w-screen-2xl">
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
    <footer className="mt-16 px-6 pb-4 text-center">
      <div className="mx-auto mb-5 h-px w-12 bg-primary/60" />
      <div className="text-foreground/90">
        <span className="text-[14px] font-semibold tracking-[-0.02em]">Skill</span>
        <span className="font-editorial text-[18px] italic text-primary-glow">Sync</span>
        <span className="font-numerical ml-1 text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
          OS / by Piyush
        </span>
      </div>
      <div className="font-numerical mt-1.5 text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
        Made for the long game
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
  eyebrow?: ReactNode;
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
        "page-masthead mb-8 px-5 pb-7 pt-2 sm:px-6 lg:mb-10 lg:px-2 lg:pb-9 lg:pt-4",
        sticky && "sticky top-0 z-50 bg-background/95 py-5 lg:static lg:bg-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-4 sm:gap-8">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="editorial-kicker mb-4 flex items-center gap-3">
              <span aria-hidden className="h-px w-6 bg-primary sm:w-9" />
              <span className="min-w-0">{eyebrow}</span>
            </div>
          ) : null}
          <h1 className="editorial-page-title text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mt-4 max-w-[62ch] text-fluid-body leading-[1.7] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0 pt-0.5 sm:pt-1">{right}</div> : null}
      </div>
      {hero ? <div className="mt-6">{hero}</div> : null}
    </header>
  );
}
