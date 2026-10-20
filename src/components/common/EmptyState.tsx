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
    <div className="animate-float-in col-span-full flex flex-col items-center justify-center gap-4 rounded-[8px] border border-dashed border-border-strong bg-card px-6 py-12 text-center">
      <div className="icon-tile-accent h-12 w-12 rounded-[6px]">
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <div className="space-y-1.5">
        <div className="font-editorial text-[21px] font-normal leading-tight tracking-[-0.025em] text-foreground">
          {title}
        </div>
        {hint ? (
          <div className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
