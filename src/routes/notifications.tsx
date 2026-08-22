import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BellOff, CheckCheck, ChevronRight, Settings2, Trash2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { CategoryIcon } from "@/components/notifications/CategoryIcon";
import { CATEGORY_META } from "@/lib/notifications/types";
import { useAppStore } from "@/store/useAppStore";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SkillSync" },
      {
        name: "description",
        content: "Every reminder SkillSync generated for you, in one place.",
      },
      { property: "og:title", content: "Notifications — SkillSync" },
      {
        property: "og:description",
        content: "Your reminder history and notification center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationsPage() {
  const items = useAppStore((s) => s.notifications?.items ?? []);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const clearAll = useAppStore((s) => s.clearNotifications);
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const today = todayISO();
    const yesterday = todayISO(new Date(Date.now() - 86_400_000));
    const buckets: { label: string; items: typeof items }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const item of items) {
      const day = todayISO(new Date(item.createdAt));
      if (day === today) buckets[0].items.push(item);
      else if (day === yesterday) buckets[1].items.push(item);
      else buckets[2].items.push(item);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [items]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow={unread > 0 ? `${unread} unread` : "All caught up"}
        title="Notifications."
        subtitle="Everything SkillSync flagged for you, stored on this device."
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/"
              aria-label="Back"
              className="glass flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
            </Link>
            <Link
              to="/profile/notifications"
              aria-label="Notification settings"
              className="glass flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              <Settings2 className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
            </Link>
          </div>
        }
      />

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:space-y-0 lg:items-start">
        {items.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            hint="Reminders for habits, planner, roadmaps and backups will collect here."
          />
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-border-strong py-2.5 text-[13px] font-medium disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" strokeWidth={1.75} />
                Mark all read
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-border-strong py-2.5 text-[13px] font-medium text-danger"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Clear all
              </button>
            </div>

            {groups.map((group) => (
              <section key={group.label} className="space-y-2">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  return (
                    <Card
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        markRead(item.id);
                        if (item.action?.kind === "route") {
                          navigate({ to: item.action.to } as never);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 p-4 transition-all active:scale-[0.99]",
                        !item.read && "border-[color-mix(in_oklab,var(--primary)_28%,transparent)]",
                      )}
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <CategoryIcon
                          name={item.icon ?? meta.icon}
                          className="h-[17px] w-[17px] text-muted-foreground"
                        />
                        {!item.read ? (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div
                            className={cn(
                              "truncate text-[14px] tracking-tight",
                              item.read ? "font-medium text-foreground/80" : "font-semibold",
                            )}
                          >
                            {item.title}
                          </div>
                          <div className="shrink-0 text-[11px] text-muted-foreground/70">
                            {timeLabel(item.createdAt)}
                          </div>
                        </div>
                        {item.body ? (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                            {item.body}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                          <span className="rounded-full bg-white/[0.05] px-2 py-0.5">
                            {meta.label}
                          </span>
                          {item.priority === "high" ? (
                            <span className="rounded-full bg-[color-mix(in_oklab,var(--danger)_22%,transparent)] px-2 py-0.5 text-danger">
                              Priority
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {item.action ? (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
                      ) : null}
                    </Card>
                  );
                })}
              </section>
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}
