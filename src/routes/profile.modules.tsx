import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";
import { Toggle } from "@/components/common/Toggle";
import { useAppStore } from "@/store/useAppStore";
import { MODULE_CATALOG, orderedModules } from "@/lib/modules";
import type { ModuleKey } from "@/lib/schema";

export const Route = createFileRoute("/profile/modules")({
  head: () => ({
    meta: [
      { title: "Modules — SkillSync" },
      {
        name: "description",
        content: "Choose which SkillSync modules are active in your workspace.",
      },
      { property: "og:title", content: "Modules — SkillSync" },
      { property: "og:description", content: "Turn workspaces on or off without losing data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModulesPage,
});

function ModulesPage() {
  const modules = useAppStore((state) => state.preferences.modules);
  const moduleOrder = useAppStore((state) => state.preferences.moduleOrder);
  const setModuleEnabled = useAppStore((state) => state.setModuleEnabled);
  const setModuleOrder = useAppStore((state) => state.setModuleOrder);
  const activeModules = orderedModules(modules, moduleOrder);
  const activeCount = activeModules.length;

  const moveModule = (index: number, delta: -1 | 1) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= activeModules.length) return;
    const keys: ModuleKey[] = activeModules.map((m) => m.key);
    const [moved] = keys.splice(index, 1);
    keys.splice(nextIndex, 0, moved);
    setModuleOrder(keys);
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 pt-1 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-11 w-11 items-center justify-center rounded-[5px] active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Preferences · {activeCount} active
          </div>
          <h1 className="font-editorial truncate text-[26px] font-normal leading-tight tracking-[-0.03em]">
            Modules
          </h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-24 lg:px-2">
        <div className="rounded-[18px] border border-[color-mix(in_oklab,var(--primary)_24%,transparent)] bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            All modules remain free and can be toggled on/off at any time in Profile → Modules.
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/75">
            Turning a module off only hides its navigation and widgets. Your local records stay
            safe.
          </p>
        </div>

        {activeModules.length > 1 ? (
          <Card className="p-4">
            <div className="mb-3">
              <div className="text-[13px] font-semibold tracking-tight">
                Navigation order beside Home
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Rearrange the order of your active modules in the bottom bar.
              </p>
            </div>
            <div className="space-y-1.5">
              {activeModules.map((mod, index) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    className="flex items-center justify-between gap-2 rounded-[6px] border border-border/60 bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="truncate text-[13px] font-medium">{mod.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${mod.title} up`}
                        disabled={index === 0}
                        onClick={() => moveModule(index, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/70 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${mod.title} down`}
                        disabled={index === activeModules.length - 1}
                        onClick={() => moveModule(index, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/70 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <div className="auto-grid">
          {MODULE_CATALOG.map(({ key, title, description, icon: Icon }) => (
            <Card key={key} className="flex items-start gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14px] font-semibold tracking-tight">{title}</div>
                  <Toggle
                    on={modules[key]}
                    onChange={(value) => setModuleEnabled(key, value)}
                    label={title}
                  />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
