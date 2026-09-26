import { cn } from "@/lib/utils";

/**
 * A titled surface: the one card treatment for dashboard blocks, lists and
 * detail sections. Header on top, content flush inside.
 */
export function Panel({
  title,
  count,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: React.ReactNode;
  count?: number;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("panel flex flex-col", className)}>
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3 md:px-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            {title}
            {count !== undefined && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Centered empty message inside a Panel or list. */
export function EmptyNote({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
