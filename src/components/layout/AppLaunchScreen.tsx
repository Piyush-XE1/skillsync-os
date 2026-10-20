import { useEffect, useState } from "react";
import { SkillSyncLogo } from "@/components/brand/SkillSyncLogo";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";
import { shouldUseBatterySaver } from "@/lib/graphics-quality";

const FULL_TIMELINE_MS = 2_050;
const REDUCED_TIMELINE_MS = 420;
const FULL_EXIT_MS = 280;
const REDUCED_EXIT_MS = 1;
const FAST_WARMUP_MS = 145;
const FAST_EXIT_MS = 115;
const MAX_WAIT_MS = 5_000;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appReady(): Promise<void> {
  const frame = new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  const fonts =
    typeof document !== "undefined" && "fonts" in document
      ? (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => undefined)
      : Promise.resolve();
  return Promise.all([frame, fonts]).then(() => undefined);
}

/**
 * A restrained first-light sequence for Monograph Noir. It preserves the
 * existing readiness, replay, battery-saver, and first-launch semantics while
 * replacing the former cinematic glow treatment with typography and hairlines.
 */
export function AppLaunchScreen() {
  const hydrated = useHydrated();
  const replayToken = useUiStore((state) => state.launchReplayToken);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [fullSequence, setFullSequence] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    // The replay token is session-local and starts at zero. Do not guard this
    // effect with a ref: React Strict Mode intentionally mounts effects twice
    // in development, and a ref guard would cancel the only live timer while
    // leaving the launch layer visible forever.
    const manualReplay = replayToken > 0;
    const firstLaunch =
      !manualReplay && !useAppStore.getState().preferences.hasCompletedFirstLaunch;
    const playFullSequence = manualReplay || firstLaunch;
    const preferences = useAppStore.getState().preferences;
    const useReducedSequence =
      typeof window !== "undefined" &&
      shouldUseBatterySaver(
        preferences.graphicsQuality,
        typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined,
        prefersReducedMotion(),
      );
    const duration = playFullSequence
      ? useReducedSequence
        ? REDUCED_TIMELINE_MS
        : FULL_TIMELINE_MS
      : FAST_WARMUP_MS;
    const exitDuration = playFullSequence
      ? useReducedSequence
        ? REDUCED_EXIT_MS
        : FULL_EXIT_MS
      : FAST_EXIT_MS;

    setFullSequence(playFullSequence);
    setReduced(useReducedSequence);
    setLeaving(false);
    setVisible(true);

    let done = false;
    let disposed = false;
    let finishTimer: number | undefined;
    let hideTimer: number | undefined;
    let minWaitTimer: number | undefined;
    const started = performance.now();

    const finish = () => {
      if (done || disposed) return;
      done = true;
      setLeaving(true);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        if (firstLaunch) {
          useAppStore.getState().updatePreferences({ hasCompletedFirstLaunch: true });
        }
      }, exitDuration);
    };

    if (!playFullSequence) {
      finishTimer = window.setTimeout(finish, duration);
    } else {
      const minimumDisplay = new Promise<void>((resolve) => {
        minWaitTimer = window.setTimeout(resolve, duration);
      });
      const cap = window.setTimeout(finish, MAX_WAIT_MS);
      void Promise.all([minimumDisplay, appReady()]).then(() => {
        if (disposed) return;
        window.clearTimeout(cap);
        const elapsed = performance.now() - started;
        finishTimer = window.setTimeout(finish, Math.max(0, duration - elapsed));
      });
      return () => {
        disposed = true;
        window.clearTimeout(cap);
        if (finishTimer !== undefined) window.clearTimeout(finishTimer);
        if (hideTimer !== undefined) window.clearTimeout(hideTimer);
        if (minWaitTimer !== undefined) window.clearTimeout(minWaitTimer);
      };
    }

    return () => {
      disposed = true;
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [hydrated, replayToken]);

  if (!visible) return null;

  if (!fullSequence) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center bg-background px-6 select-none"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          opacity: leaving ? 0 : 1,
          transition: `opacity ${FAST_EXIT_MS}ms ease-out`,
        }}
      >
        <div className="ssx-fast-mark flex flex-col items-center">
          <SkillSyncLogo size={48} />
          <div className="font-editorial mt-4 text-[18px] tracking-[-0.01em] text-foreground">
            SkillSync <span className="text-primary">OS</span>
          </div>
        </div>
        <style>{`
          @keyframes ssx-fast-mark { from { opacity: 0; } to { opacity: 1; } }
          .ssx-fast-mark { animation: ssx-fast-mark 90ms ease-out both; }
        `}</style>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden bg-background px-6 text-foreground select-none"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${reduced ? REDUCED_EXIT_MS : FULL_EXIT_MS}ms ease-out`,
      }}
    >
      <div className="monograph-grain absolute inset-0" />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col">
        <header className="ssx-launch-meta flex items-center justify-between gap-4 border-b border-border pb-4">
          <span className="editorial-kicker">SkillSync OS</span>
          <span className="font-numerical text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            The Personal Monograph · Vol. I
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="ssx-launch-mark">
            <SkillSyncLogo size={132} />
          </div>
          <h1 className="ssx-launch-title font-editorial mt-8 text-[clamp(2.5rem,8vw,5.5rem)] font-normal leading-none tracking-[-0.045em]">
            SkillSync OS
          </h1>
          <div className="ssx-launch-rule mt-7 h-px w-36 bg-primary" />
          <p className="ssx-launch-copy font-editorial mt-6 text-[clamp(1.25rem,3vw,2rem)] text-foreground/85">
            Less visual noise. More meaning.
          </p>
          <p className="ssx-launch-copy mt-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Local-first · Private by design
          </p>
        </main>

        <footer className="ssx-launch-meta flex items-center justify-between border-t border-border pt-4 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Identity · Perspective · Practice</span>
          <span className="font-numerical">#08080A / #C29F62</span>
        </footer>
      </div>

      <style>{`
        @keyframes ssx-launch-fade { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: none; } }
        @keyframes ssx-launch-rule { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
        .ssx-launch-meta { animation: ssx-launch-fade 360ms ease-out 80ms both; }
        .ssx-launch-mark { animation: ssx-launch-fade 420ms ease-out 220ms both; }
        .ssx-launch-title { animation: ssx-launch-fade 480ms ease-out 470ms both; }
        .ssx-launch-rule { transform-origin: center; animation: ssx-launch-rule 500ms ease-out 760ms both; }
        .ssx-launch-copy { animation: ssx-launch-fade 420ms ease-out 980ms both; }
        @media (prefers-reduced-motion: reduce) {
          .ssx-launch-meta, .ssx-launch-mark, .ssx-launch-title, .ssx-launch-rule, .ssx-launch-copy { animation: none; }
        }
      `}</style>
    </div>
  );
}
