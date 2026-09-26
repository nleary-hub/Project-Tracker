import { SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Page title row: eyebrow, title, description on the left; actions on the right. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-4 pt-6 md:px-8 md:pt-8", className)}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">{eyebrow}</div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8", className)}>
      {children}
    </div>
  );
}

/** Placeholder for sections that later milestones fill in. */
export function ComingSoon({
  milestone,
  children,
}: {
  milestone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <SparklesIcon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="mb-0.5 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
          Arrives in {milestone}
        </p>
        {children}
      </div>
    </div>
  );
}
