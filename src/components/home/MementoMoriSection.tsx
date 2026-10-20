import { useEffect, useState } from "react";
import { CalendarDays, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { TextField } from "@/components/edit/Fields";
import { BottomSheet } from "@/components/edit/Sheet";
import { EditorialSectionHeader } from "./EditorialSectionHeader";
import { ageInDays, dayOfCalendarYear, daysInCalendarYear, localDateISO } from "@/lib/monograph";
import { useAppStore } from "@/store/useAppStore";

export function MementoMoriSection() {
  const birthDate = useAppStore((state) => state.birthDate);
  const ageDisplayUnit = useAppStore((state) => state.ageDisplayUnit);
  const setBirthDate = useAppStore((state) => state.setBirthDate);
  const setAgeDisplayUnit = useAppStore((state) => state.setAgeDisplayUnit);

  const [now, setNow] = useState(() => new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [birthDraft, setBirthDraft] = useState(birthDate ?? "");

  useEffect(() => {
    let timeout = 0;
    const schedule = () => {
      const current = new Date();
      const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      timeout = window.setTimeout(
        () => {
          setNow(new Date());
          schedule();
        },
        Math.max(1_000, next.getTime() - current.getTime() + 250),
      );
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, []);

  const day = dayOfCalendarYear(now);
  const totalDays = daysInCalendarYear(now.getFullYear());
  const ageDays = birthDate ? ageInDays(birthDate, now) : null;
  const ageValue =
    ageDays === null ? null : ageDisplayUnit === "weeks" ? Math.floor(ageDays / 7) : ageDays;

  const saveBirthDate = () => {
    if (!birthDraft) {
      setBirthDate(null);
      setEditorOpen(false);
      return;
    }
    if (ageInDays(birthDraft, now) === null) {
      toast.error("Choose a valid date that is not in the future.");
      return;
    }
    setBirthDate(birthDraft);
    toast.success("Perspective date saved on this device");
    setEditorOpen(false);
  };

  return (
    <section aria-labelledby="memento-heading" className="px-5 py-16 lg:px-2 lg:py-24">
      <EditorialSectionHeader
        index="03 / 04"
        title="Memento Mori"
        subtitle="Time and perspective, without alarm."
        meta={`Local calendar · ${now.getFullYear()}`}
      />
      <h2 id="memento-heading" className="sr-only">
        Memento Mori — time and perspective
      </h2>

      <div className="grid border-y border-border md:grid-cols-2 md:divide-x md:divide-border">
        <article className="py-8 md:pr-10 lg:py-12 lg:pr-16">
          <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
            Day of the current year
          </div>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-numerical text-[clamp(3.5rem,9vw,7.5rem)] leading-none tracking-[-0.07em]">
              {String(day).padStart(3, "0")}
            </span>
            <span className="font-numerical text-sm text-muted-foreground">/ {totalDays}</span>
          </div>
          <div className="mt-6 h-px bg-border">
            <div
              className="h-px bg-primary"
              style={{ width: `${Math.min(100, (day / totalDays) * 100)}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Calculated from your device's local calendar. Leap years and year boundaries are handled
            automatically.
          </p>
        </article>

        <article className="border-t border-border py-8 md:border-t-0 md:pl-10 lg:py-12 lg:pl-16">
          <div className="flex items-start justify-between gap-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              {ageDisplayUnit === "weeks" ? "Age in completed weeks" : "Age in completed days"}
            </div>
            {birthDate ? (
              <IconButton
                size="sm"
                aria-label="Edit date of birth"
                onClick={() => {
                  setBirthDraft(birthDate);
                  setEditorOpen(true);
                }}
              >
                <PenLine className="h-3.5 w-3.5" />
              </IconButton>
            ) : null}
          </div>

          {ageValue !== null ? (
            <>
              <div className="font-numerical mt-5 text-[clamp(3.5rem,9vw,7.5rem)] leading-none tracking-[-0.07em]">
                {ageValue.toLocaleString()}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {(["weeks", "days"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    aria-pressed={ageDisplayUnit === unit}
                    onClick={() => setAgeDisplayUnit(unit)}
                    className={
                      "min-h-9 border px-3 text-[10px] font-semibold uppercase tracking-[0.13em] " +
                      (ageDisplayUnit === unit
                        ? "border-primary text-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {unit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setBirthDate(null);
                    setBirthDraft("");
                    toast.success("Date removed");
                  }}
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Remove date
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <p className="font-editorial max-w-md text-3xl leading-tight">
                Add only if this perspective serves you.
              </p>
              <p className="mt-3 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                Your date of birth is optional, stays inside local SkillSync data, and is never
                inferred.
              </p>
              <ActionButton
                size="sm"
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setBirthDraft("");
                  setEditorOpen(true);
                }}
              >
                <CalendarDays className="h-4 w-4" /> Add date of birth
              </ActionButton>
            </div>
          )}
        </article>
      </div>

      <BottomSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title="Optional date of birth"
        description="This remains in your local workspace and is used only to calculate the number shown here."
        footer={
          <div className="flex gap-2">
            <ActionButton variant="outline" className="flex-1" onClick={() => setEditorOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" onClick={saveBirthDate}>
              Save date
            </ActionButton>
          </div>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Date of birth
          </span>
          <TextField
            type="date"
            value={birthDraft}
            max={localDateISO(now)}
            onChange={(event) => setBirthDraft(event.target.value)}
          />
        </label>
      </BottomSheet>
    </section>
  );
}
