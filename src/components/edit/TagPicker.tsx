import { useState } from "react";
import { cn } from "@/lib/utils";
import { mergeTags, normalizeTag, sameTag, toggleTag } from "@/lib/tags";
import { TextField } from "./Fields";
import { ActionButton } from "./Buttons";

/**
 * Shared tag selector for local-first records.
 *
 * `suggestions` comes from the owning domain (preset expense tags plus saved
 * expense tags, or tags already used in the people journal). Creating a tag
 * calls `onCreate` so the domain can persist it where relevant; the palette is
 * always deduplicated case-insensitively.
 */
export function TagPicker({
  value,
  suggestions,
  onChange,
  onCreate,
  placeholder = "Custom tag",
}: {
  value: readonly string[];
  suggestions: readonly string[];
  onChange: (tags: string[]) => void;
  onCreate?: (tag: string) => void;
  placeholder?: string;
}) {
  const [custom, setCustom] = useState("");
  const palette = mergeTags(suggestions, value);

  const toggle = (tag: string) => onChange(toggleTag(value, tag));

  const addCustom = () => {
    const tag = normalizeTag(custom);
    setCustom("");
    if (!tag) return;
    if (value.some((existing) => sameTag(existing, tag))) return;
    onChange([...value, tag]);
    onCreate?.(tag);
  };

  return (
    <div className="space-y-2">
      {palette.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {palette.map((tag) => {
            const on = value.some((existing) => sameTag(existing, tag));
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag)}
                className={cn(
                  "font-numerical min-h-9 rounded-[4px] border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.06em] transition-colors",
                  on
                    ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary-glow"
                    : "border-border bg-background text-muted-foreground hover:border-border-strong",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex gap-2">
        <TextField
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
        />
        <ActionButton variant="outline" onClick={addCustom}>
          Add
        </ActionButton>
      </div>
    </div>
  );
}
