import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";

/**
 * Dependency-free select (shadcn-style compound API, SkillSync styling).
 *
 * Supported usage:
 *   <Select value={v} onValueChange={setV}>
 *     <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="a">Option A</SelectItem>
 *     </SelectContent>
 *   </Select>
 */

interface SelectContextValue {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Record<string, string>;
  registerItem: (value: string, label: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Select>`);
  }
  return ctx;
}

/** Flatten arbitrary ReactNode children into a plain text label. */
function nodeToLabel(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToLabel).join("");
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.props && typeof element.props === "object" && "children" in element.props) {
    return nodeToLabel(element.props.children);
  }
  return "";
}

export function Select({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const registerItem = useCallback((itemValue: string, label: string) => {
    setLabels((prev) => (prev[itemValue] === label ? prev : { ...prev, [itemValue]: label }));
  }, []);

  const setValue = useCallback(
    (next: string) => {
      onValueChange?.(next);
      setOpen(false);
    },
    [onValueChange],
  );

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const ctx = useMemo<SelectContextValue>(
    () => ({ value: value ?? "", setValue, open, setOpen, labels, registerItem }),
    [value, setValue, open, labels, registerItem],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div
        ref={rootRef}
        className={cn("relative inline-flex", className)}
        data-state={open ? "open" : "closed"}
      >
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
  className,
  disabled = false,
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { open, setOpen } = useSelectContext("SelectTrigger");
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 min-w-0 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground outline-none transition-colors focus:border-[color-mix(in_oklab,var(--primary)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelectContext("SelectValue");
  return <span className="truncate">{value ? (labels[value] ?? value) : (placeholder ?? "")}</span>;
}

export function SelectContent({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useSelectContext("SelectContent");
  if (!open) return null;
  return (
    <div
      role="listbox"
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[oklch(0.17_0.01_270/0.97)] p-1 shadow-xl backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className,
  disabled = false,
}: {
  value: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { registerItem, setValue, value: selected } = useSelectContext("SelectItem");
  const label = useMemo(() => nodeToLabel(children), [children]);

  useEffect(() => {
    registerItem(value, label);
  }, [value, label, registerItem]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected === value}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-50",
        selected === value && "text-[color-mix(in_oklab,var(--primary-glow)_88%,white)]",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {selected === value && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
