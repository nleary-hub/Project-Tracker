"use client";

import { CheckCircle2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setTaskStatus } from "@/app/w/[slug]/task-actions";
import { EmptyNote } from "@/components/panel";
import { PriorityBadge } from "@/components/task-badges";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskPriority } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export interface MyTaskItem {
  id: string;
  title: string;
  priority: TaskPriority;
  projectId: string;
  projectName: string;
  /** Pre-formatted due label ("Oct 3") or null. */
  due: string | null;
  overdue: boolean;
  blocked: boolean;
}

/** The signed-in person's open tasks; ticking one completes it and slides it away. */
export function MyTasksPanel({ slug, tasks }: { slug: string; tasks: MyTaskItem[] }) {
  const [pending, startTransition] = useTransition();
  const [visible, hide] = useOptimistic(tasks, (state, id: string) =>
    state.filter((t) => t.id !== id),
  );
  const reduce = useReducedMotion();

  function complete(task: MyTaskItem) {
    startTransition(async () => {
      hide(task.id);
      const result = await setTaskStatus(slug, task.id, "done");
      if (result?.ok) toast.success(`Completed ${task.title}.`);
      else toast.error(result?.error ?? "Couldn't complete the task.");
    });
  }

  if (visible.length === 0) {
    return (
      <EmptyNote icon={CheckCircle2Icon} title="You're clear">
        Tasks assigned to you show up here, soonest due first.
      </EmptyNote>
    );
  }

  return (
    <ul className="divide-y divide-border/70">
      <AnimatePresence initial={false}>
        {visible.map((task) => (
          <motion.li
            key={task.id}
            layout={!reduce}
            initial={false}
            exit={reduce ? undefined : { opacity: 0, x: 24, height: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className="flex items-center gap-3 px-4 py-2.5 md:px-5"
          >
            <Checkbox
              aria-label={`Complete ${task.title}`}
              disabled={pending}
              onCheckedChange={(next) => next && complete(task)}
              className="rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <Link
                  href={`/w/${slug}/projects/${task.projectId}`}
                  className="truncate hover:text-foreground hover:underline"
                >
                  {task.projectName}
                </Link>
                {task.blocked && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-health-off-track">Blocked</span>
                  </>
                )}
              </p>
            </div>
            <PriorityBadge
              priority={task.priority}
              showLabel={false}
              className="hidden sm:inline-flex"
            />
            {task.due && (
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                  task.overdue
                    ? "bg-health-off-track/10 font-medium text-health-off-track"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {task.overdue ? "Overdue · " : ""}
                {task.due}
              </span>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
