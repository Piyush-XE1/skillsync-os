import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";
import { Toggle } from "@/components/common/Toggle";
import { useAppStore } from "@/store/useAppStore";
import { MODULE_CATALOG } from "@/lib/modules";

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
  const setModuleEnabled = useAppStore((state) => state.setModuleEnabled);
  const activeCount = Object.values(modules).filter(Boolean).length;

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 pt-1 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Preferences · {activeCount} active
          </div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
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
