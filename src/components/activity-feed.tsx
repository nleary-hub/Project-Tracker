import { ActivityIcon } from "lucide-react";
import Link from "next/link";

import { EmptyNote } from "@/components/panel";
import { type ActivityLike, describeActivity } from "@/lib/activity";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/utils";

export interface ActivityFeedItem extends ActivityLike {
  id: string;
  actorName: string;
  /** Pre-formatted on the server ("2h ago"), so the client renders the same text. */
  when: string;
  /** Exact timestamp for the tooltip. */
  whenExact: string;
  /** Shown as a link when the feed spans projects. */
  project?: { id: string; name: string; href: string };
}

/**
 * The activity log as sentences: who did what, to which task or milestone,
 * how long ago. Used on the project page and, with project links, the dashboard.
 */
export function ActivityFeed({
  items,
  formatDate,
  emptyTitle = "No activity yet",
  emptyBody = "Task and milestone changes show up here as they happen.",
  className,
}: {
  items: ActivityFeedItem[];
  formatDate: (isoDate: string) => string;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyNote icon={ActivityIcon} title={emptyTitle}>
        {emptyBody}
      </EmptyNote>
    );
  }
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, i) => {
        const text = describeActivity(item, formatDate);
        return (
          <li key={item.id} className="relative flex gap-3 px-4 py-2.5 md:px-5">
            {i < items.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-9 bottom-0 left-[27px] w-px bg-border md:left-[31px]"
              />
            )}
            <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand ring-2 ring-card">
              {initialsOf(item.actorName, item.actorName)}
            </span>
            <div className="min-w-0 flex-1 text-sm leading-snug">
              <p className="text-foreground/90">
                <span className="font-medium text-foreground">{item.actorName}</span> {text.verb}
                {text.subject && (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">{text.subject}</span>
                  </>
                )}
                {text.detail && <span className="text-muted-foreground"> {text.detail}</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <time dateTime={item.whenExact} title={item.whenExact}>
                  {item.when}
                </time>
                {item.project && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={item.project.href}
                      className="truncate hover:text-foreground hover:underline"
                    >
                      {item.project.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
