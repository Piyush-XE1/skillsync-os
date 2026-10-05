import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Compass, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/edit/Sheet";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import {
  FOCUS_TRACKS,
  MODULE_CATALOG,
  modulesForFocusTrack,
  type FocusTrackId,
} from "@/lib/modules";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["A calmer start", "Choose your focus", "Your workspace"];

/** First-run, three-step focus setup. Turning a module off never deletes its records. */
export function OnboardingFocusSheet() {
  const hydrated = useHydrated();
  const hasCompletedFirstLaunch = useAppStore((state) => state.preferences.hasCompletedFirstLaunch);
  const onboardingCompleted = useAppStore((state) => state.preferences.onboardingCompleted);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTrack, setSelectedTrack] = useState<FocusTrackId>("academics");

  const open = hydrated && hasCompletedFirstLaunch && !onboardingCompleted;
  const track =
    FOCUS_TRACKS.find((candidate) => candidate.id === selectedTrack) ?? FOCUS_TRACKS[0]!;
  const enabledModules =
    track.modules === "all"
      ? MODULE_CATALOG
      : MODULE_CATALOG.filter((item) => track.modules.includes(item.key));

  const finish = () => {
    updatePreferences({
      modules: modulesForFocusTrack(selectedTrack),
      onboardingCompleted: true,
    });
    haptics.success();
    sound.success();
    void navigate({ to: "/" });
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => undefined}
      showClose={false}
      title={STEP_TITLES[step - 1]}
      description={`Step ${step} of 3 · A focused start, with room to grow.`}
      className="border-t border-[var(--border-strong)]"
    >
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((number) => (
            <span
              key={number}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                number <= step ? "bg-[var(--primary)]" : "bg-white/[0.08]",
              )}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="rounded-[22px] border border-border bg-surface/80 p-5">
            <span className="icon-tile h-12 w-12 rounded-2xl">
              <Compass className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h2 className="mt-4 text-[21px] font-semibold leading-tight tracking-tight">
              Keep the useful. Leave the noise.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Start with the part of life you want SkillSync to support. Your focus choice only
              changes what is surfaced — existing data stays safe on this device.
            </p>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                sound.select();
                setStep(2);
              }}
              className="pressable gradient-primary mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Choose my focus <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-2.5">
            {FOCUS_TRACKS.map((option) => {
              const active = option.id === selectedTrack;
              const count =
                option.modules === "all" ? MODULE_CATALOG.length : option.modules.length;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedTrack(option.id);
                    haptics.selection();
                    sound.select();
                  }}
                  className={cn(
                    "w-full rounded-[18px] border p-3.5 text-left transition-colors active:scale-[0.99]",
                    active
                      ? "border-[color-mix(in_oklab,var(--primary)_55%,transparent)] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]"
                      : "border-border bg-white/[0.02]",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]",
                        active
                          ? "bg-[var(--primary)]/15 text-[var(--primary-glow)]"
                          : "bg-white/[0.04] text-muted-foreground",
                      )}
                    >
                      {option.id === "full-power" ? (
                        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      ) : (
                        <Compass className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-semibold tracking-tight">
                          {option.title}
                        </span>
                        {active ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                      <span className="mt-1.5 block text-[10.5px] font-medium text-[var(--primary-glow)]">
                        {count} modules in your primary workspace
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border bg-surface/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Starting with
              </div>
              <div className="mt-1 text-[17px] font-semibold tracking-tight">{track.title}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {enabledModules.map((module) => (
                  <span
                    key={module.key}
                    className="rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {module.navLabel}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              All modules remain free and can be toggled on/off at any time in Profile → Modules.
            </p>
            <button
              type="button"
              onClick={finish}
              className="pressable gradient-primary flex h-12 w-full items-center justify-center gap-2 rounded-[15px] text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Activate my workspace <Check className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            className="pressable inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span className="text-[10.5px] text-muted-foreground/75">
            Saved locally · no account needed
          </span>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-foreground"
            >
              Review <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : step === 1 ? (
            <span className="w-[58px]" aria-hidden />
          ) : (
            <span className="w-[58px]" aria-hidden />
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
