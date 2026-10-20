import type { ReactNode } from "react";

export function EditorialSectionHeader({
  index,
  title,
  subtitle,
  meta,
  action,
}: {
  index: string;
  title: string;
  subtitle: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 border-t border-border pt-5 sm:grid sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-5">
      <div className="font-numerical mb-3 text-[10px] tracking-[0.18em] text-primary sm:mb-0">
        {index}
      </div>
      <div className="min-w-0">
        <h2 className="font-editorial text-[clamp(2rem,5vw,3.75rem)] font-normal leading-[0.95] tracking-[-0.035em]">
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
        {meta ? (
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            {meta}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-4 shrink-0 sm:mt-0">{action}</div> : null}
    </header>
  );
}
