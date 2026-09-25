import { Link } from "@tanstack/react-router";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";

/**
 * A single, unmissable strip while the demo persona is loaded — with the one
 * action that matters: put my real workspace back. Rendered by the shell so it
 * follows the user across routes (the danger with demo mode is forgetting it is
 * running and typing real data into it).
 */
export function DemoBanner() {
  const demoMode = useAppStore((s) => s.demoMode);
  const exitDemoWorkspace = useAppStore((s) => s.exitDemoWorkspace);

  if (!demoMode) return null;

  const exit = () => {
    haptics.tap();
    sound.close();
    const restored = exitDemoWorkspace();
    toast.success(restored ? "Your workspace is back" : "Demo closed", {
      description: restored
        ? "Everything is exactly where you left it."
        : "No snapshot was found, so you are on a fresh workspace.",
    });
  };

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(env(safe-area-inset-top),8px)]">
      <div className="glass animate-float-in flex max-w-2xl items-center gap-2.5 rounded-full border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-3 py-1.5 shadow-[var(--shadow-float)]">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-[var(--warning)]" strokeWidth={2} />
        <span className="min-w-0 flex-1 text-[11.5px] font-medium text-foreground/90">
          <span className="hidden sm:inline">Demo workspace · a generated student persona. </span>
          <span className="sm:hidden">Demo data · </span>
          Your own data is saved.
        </span>
        <Link
          to="/showcase"
          className="hidden shrink-0 text-[11.5px] text-muted-foreground underline-offset-2 hover:underline sm:inline"
        >
          About
        </Link>
        <button
          type="button"
          onClick={exit}
          className="pressable gradient-primary inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold text-white"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
          Exit
        </button>
      </div>
    </div>
  );
}
