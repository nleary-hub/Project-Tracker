import { cn } from "@/lib/utils";

/** A titled block on a settings page: heading column on the left, controls on the right. */
export function SettingsSection({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "scroll-mt-6 border-t border-border py-8 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10">
        <div>
          <div className="flex items-start justify-between gap-3 lg:block">
            <h2 id={`${id}-heading`} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {actions && <div className="lg:hidden">{actions}</div>}
          </div>
          {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
          {actions && <div className="mt-4 hidden lg:block">{actions}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function SettingsNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-sm border border-dashed border-border bg-surface px-3 py-2 text-sm text-ink-secondary">
      {children}
    </p>
  );
}
