import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Dependency-free tabs (shadcn-style compound API, SkillSync styling).
 *
 * Supported usage:
 *   <Tabs value={v} onValueChange={setV}>
 *     <TabsList><TabsTrigger value="a">A</TabsTrigger></TabsList>
 *     <TabsContent value="a">...</TabsContent>
 *   </Tabs>
 */

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Tabs>`);
  }
  return ctx;
}

export function Tabs({
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
  return (
    <TabsContext.Provider value={{ value: value ?? "", setValue: (v) => onValueChange?.(v) }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
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
  const { value: selected, setValue } = useTabsContext("TabsTrigger");
  const isActive = selected === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        "flex-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-all duration-200 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-white/[0.07] text-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children?: ReactNode;
  className?: string;
}) {
  const { value: selected } = useTabsContext("TabsContent");
  if (selected !== value) return null;
  return (
    <div role="tabpanel" data-state="active" className={className}>
      {children}
    </div>
  );
}
