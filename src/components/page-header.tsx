/** Slate title band used at the top of every workspace page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-end gap-4 px-4 py-5 md:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6">{children}</div>;
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
    <div className="rounded-sm border border-dashed border-border bg-surface p-8 text-sm text-ink-secondary">
      <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        Arrives in {milestone}
      </p>
      {children}
    </div>
  );
}
