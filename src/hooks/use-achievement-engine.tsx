import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { newlyUnlocked, achievementById } from "@/lib/achievements";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import type { AppData } from "@/lib/schema";

/**
 * Watches the workspace for freshly-satisfied achievements and awards them
 * exactly once: XP, an in-app toast, haptics and a notification entry.
 *
 * Checking is debounced (like the recovery-snapshot subscriber in AppShell)
 * so heavy edits don't run the evaluator on every keystroke.
 */
export function useAchievementEngine() {
  const hydrated = useAppStore((s) => s._hydrated);
  const lastLevelRef = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    lastLevelRef.current = useAppStore.getState().stats.level;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const unsubscribe = useAppStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (running) return;
        running = true;
        try {
          const state = useAppStore.getState();
          const data = state as unknown as AppData;
          const fresh = newlyUnlocked(data);
          if (fresh.length === 0) return;
          const ids = state.unlockAchievements(fresh.map((a) => a.id));
          for (const id of ids) {
            const achievement = achievementById(id);
            if (!achievement) continue;
            haptics.success();
            sound.achievement();
            // A burst of confetti — the whole surface briefly celebrates.
            fireConfetti({ count: 140, origin: { x: 0.5, y: 0.5 }, ttl: 2 });
            toast.success("Achievement unlocked", {
              description: `${achievement.icon} ${achievement.title} — ${achievement.description}`,
              duration: 4200,
            });
            state.pushNotification({
              category: "achievements",
              title: `${achievement.icon} ${achievement.title}`,
              body: `${achievement.description} (+${achievement.xp} XP)`,
              priority: "high",
              icon: "trophy",
              action: null,
              sourceId: `achievement:${id}`,
            });
          }
          // Level-up celebration when achievement XP tips the scale.
          const nextLevel = useAppStore.getState().stats.level;
          if (nextLevel > lastLevelRef.current) {
            haptics.milestone();
            sound.levelUp();
            // A bigger, eponymous "level up" cannon from the top.
            fireConfetti({ count: 220, origin: { x: 0.5, y: 0.3 }, ttl: 2.6, shape: "circle" });
            toast.success(`Level ${nextLevel} reached!`, {
              description: "Keep the momentum going.",
              duration: 4200,
            });
            lastLevelRef.current = nextLevel;
          }
        } finally {
          running = false;
        }
      }, 1200);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [hydrated]);
}
