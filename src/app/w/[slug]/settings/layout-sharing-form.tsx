"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import { updateLayoutSharing } from "./actions";

export type LayoutSharingMode = "shared" | "split" | "personal";

/** docs/PLAN.md D25 / §8 "Who sees what". */
const OPTIONS: { value: LayoutSharingMode; title: string; description: string }[] = [
  {
    value: "shared",
    title: "Everything shared",
    description:
      "Row order, column order, widths, hidden columns, row height and sort are the same for everyone. Filters are always personal.",
  },
  {
    value: "split",
    title: "Split",
    description:
      "Row order is shared. Column order, widths, hidden columns, row height and sort are per person.",
  },
  {
    value: "personal",
    title: "Everything personal",
    description:
      "Each person keeps their own order and layout. Reports always use the order admins set.",
  },
];

export function LayoutSharingForm({
  slug,
  mode,
  isAdmin,
}: {
  slug: string;
  mode: LayoutSharingMode;
  isAdmin: boolean;
}) {
  const [value, setValue] = useState<LayoutSharingMode>(mode);
  const [pending, startTransition] = useTransition();

  function change(next: unknown) {
    if (typeof next !== "string" || next === value) return;
    const previous = value;
    setValue(next as LayoutSharingMode);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mode", next);
      const result = await updateLayoutSharing(slug, null, fd);
      if (result?.ok) toast.success(result.message);
      else {
        setValue(previous);
        toast.error(result?.error ?? "Couldn't save the setting.");
      }
    });
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={change}
      disabled={!isAdmin || pending}
      aria-label="Layout sharing"
      className="max-w-xl gap-2"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex gap-3 rounded-sm border bg-surface p-3 transition-colors",
              isAdmin ? "cursor-pointer hover:bg-surface-muted" : "cursor-default",
              selected ? "border-brand ring-1 ring-brand" : "border-border",
            )}
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{option.title}</span>
              <span className="mt-0.5 block text-sm text-ink-secondary">{option.description}</span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
