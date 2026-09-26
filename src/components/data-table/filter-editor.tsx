"use client";

import { XIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  type ColumnFilter,
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  type DatePreset,
  type FilterState,
  NONE_VALUE,
  isEmptyFilter,
} from "@/lib/table/filters";

import type { DataTableColumn } from "./types";

/** Per-column filter editor used in the header popover and the phone sheet. */
export function FilterEditor<Row>({
  column,
  value,
  counts,
  onChange,
  onClose,
}: {
  column: DataTableColumn<Row>;
  value: ColumnFilter | undefined;
  /** Distinct value → number of rows, for enum columns. */
  counts: Map<string | null, number>;
  onChange: (filter: ColumnFilter | null) => void;
  onClose?: () => void;
}) {
  switch (column.kind) {
    case "text":
      return (
        <TextFilter
          initial={value?.kind === "text" ? value.contains : ""}
          onApply={(contains) => {
            onChange(contains.trim() ? { kind: "text", contains } : null);
            onClose?.();
          }}
        />
      );
    case "enum":
      return (
        <EnumFilter
          options={enumOptionsWithCounts(column, counts)}
          selected={value?.kind === "enum" ? value.values : []}
          onChange={(values) => onChange(values.length ? { kind: "enum", values } : null)}
        />
      );
    case "date":
      return (
        <DateFilter
          value={value?.kind === "date" ? value : undefined}
          onChange={(f) => onChange(f && !isEmptyFilter(f) ? f : null)}
        />
      );
  }
}

function enumOptionsWithCounts<Row>(
  column: DataTableColumn<Row>,
  counts: Map<string | null, number>,
) {
  const options = (
    column.enumOptions ??
    [...counts.keys()].filter((k): k is string => k !== null).map((v) => ({ value: v, label: v }))
  ).map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }));
  const noneCount = counts.get(null) ?? 0;
  if (noneCount > 0 || column.noneLabel) {
    options.push({ value: NONE_VALUE, label: column.noneLabel ?? "None", count: noneCount });
  }
  return options;
}

function TextFilter({ initial, onApply }: { initial: string; onApply: (v: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(text);
      }}
    >
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contains…"
        aria-label="Contains"
      />
      <div className="flex justify-end gap-1">
        {initial && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onApply("")}>
            Clear
          </Button>
        )}
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}

function EnumFilter({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string; count: number }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => {
        const checked = selected.includes(o.value);
        return (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) =>
                onChange(next ? [...selected, o.value] : selected.filter((v) => v !== o.value))
              }
            />
            <span className="flex-1 truncate">{o.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>
          </label>
        );
      })}
      {selected.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => onChange([])}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

function DateFilter({
  value,
  onChange,
}: {
  value: Extract<ColumnFilter, { kind: "date" }> | undefined;
  onChange: (f: ColumnFilter | null) => void;
}) {
  const preset = value && "preset" in value ? value.preset : null;
  const from = value && "from" in value ? (value.from ?? "") : "";
  const to = value && "to" in value ? (value.to ?? "") : "";
  // Several date editors can be open at once in the phone sheet.
  const ids = useId();

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={preset ?? (value ? "range" : null)}
        onValueChange={(v) => {
          if (v === "range")
            onChange(from || to ? { kind: "date", from: from || null, to: to || null } : null);
          else if (typeof v === "string") onChange({ kind: "date", preset: v as DatePreset });
        }}
        className="gap-1"
      >
        {DATE_PRESETS.map((p) => (
          <label
            key={p}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted"
          >
            <RadioGroupItem value={p} />
            {DATE_PRESET_LABELS[p]}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted">
          <RadioGroupItem value="range" />
          Between
        </label>
      </RadioGroup>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${ids}-from`} className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id={`${ids}-from`}
            type="date"
            value={from}
            onChange={(e) =>
              onChange({ kind: "date", from: e.target.value || null, to: to || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${ids}-to`} className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id={`${ids}-to`}
            type="date"
            value={to}
            onChange={(e) =>
              onChange({ kind: "date", from: from || null, to: e.target.value || null })
            }
          />
        </div>
      </div>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => onChange(null)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

/** Active filters as removable chips above the table. */
export function FilterChips<Row>({
  columns,
  filters,
  onRemove,
  onClearAll,
}: {
  columns: DataTableColumn<Row>[];
  filters: FilterState;
  onRemove: (columnId: string) => void;
  onClearAll: () => void;
}) {
  const active = Object.entries(filters).filter(([, f]) => !isEmptyFilter(f));
  if (active.length === 0) return null;
  const byId = new Map(columns.map((c) => [c.id, c]));

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="filter-chips">
      {active.map(([id, filter]) => {
        const column = byId.get(id);
        if (!column) return null;
        return (
          <span
            key={id}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-surface pr-1 pl-2 text-xs text-ink"
          >
            <span className="text-ink-muted">{column.header}:</span>
            <span className="max-w-56 truncate font-medium">{describeFilter(column, filter)}</span>
            <button
              type="button"
              aria-label={`Remove ${column.header} filter`}
              className="rounded-sm p-0.5 text-ink-muted hover:bg-muted hover:text-ink"
              onClick={() => onRemove(id)}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        );
      })}
      {active.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}

export function describeFilter<Row>(column: DataTableColumn<Row>, filter: ColumnFilter): string {
  switch (filter.kind) {
    case "text":
      return `“${filter.contains.trim()}”`;
    case "enum": {
      const labels = new Map((column.enumOptions ?? []).map((o) => [o.value, o.label]));
      labels.set(NONE_VALUE, column.noneLabel ?? "None");
      return filter.values.map((v) => labels.get(v) ?? v).join(", ");
    }
    case "date":
      if ("preset" in filter) return DATE_PRESET_LABELS[filter.preset];
      if (filter.from && filter.to) return `${filter.from} – ${filter.to}`;
      if (filter.from) return `from ${filter.from}`;
      return `until ${filter.to}`;
  }
}
