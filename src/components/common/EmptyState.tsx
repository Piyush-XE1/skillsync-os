import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  hint?: string;
  icon?: typeof Inbox;
  action?: ReactNode;
}) {
  return (
    <div className="animate-float-in col-span-full flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-white/[0.09] bg-white/[0.012] px-6 py-12 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent), transparent 70%)",
          }}
        />
        <div className="icon-tile-accent h-14 w-14 rounded-[18px]">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">{title}</div>
        {hint ? (
          <div className="mx-auto max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
