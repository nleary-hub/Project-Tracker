"use client";

import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  FolderKanbanIcon,
  MilestoneIcon,
} from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const ICONS = {
  projects: FolderKanbanIcon,
  overdue: AlertTriangleIcon,
  week: CalendarClockIcon,
  tasks: CheckSquareIcon,
  milestones: MilestoneIcon,
} as const;
export type StatIcon = keyof typeof ICONS;

export interface StatTileProps {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  /** Icon key rather than a component, so server components can pass it. */
  icon: StatIcon;
  /** Draws attention when something needs it (overdue counts). */
  tone?: "neutral" | "warn" | "danger" | "brand";
  index?: number;
}

const TONE = {
  neutral: "text-muted-foreground bg-muted",
  brand: "text-brand bg-brand-soft",
  warn: "text-health-at-risk bg-health-at-risk/12",
  danger: "text-health-off-track bg-health-off-track/10",
};

/** KPI tile: the number counts up on first paint, then sits still. */
export function StatTile({
  label,
  value,
  hint,
  href,
  icon,
  tone = "neutral",
  index = 0,
}: StatTileProps) {
  const Icon = ICONS[icon];
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce || value === 0) {
      node.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-7 items-center justify-center rounded-lg", TONE[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          ref={ref}
          className="text-[28px] leading-none font-semibold tracking-tight text-foreground"
        >
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </>
  );

  const className = cn("panel block p-4", href && "panel-hover");
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 1, 0.5, 1] }}
    >
      {href ? (
        <Link href={href} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </motion.div>
  );
}
