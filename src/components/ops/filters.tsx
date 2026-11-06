"use client";

import { useState } from "react";
import { RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type RangeKey } from "@/lib/time-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A row of filters with a clear-all and an optional refresh. */
export function FilterBar({
  children,
  active = 0,
  onClear,
  onRefresh,
  refreshing,
  className,
}: {
  children: React.ReactNode;
  active?: number;
  onClear?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {active > 0 && onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <XIcon />
          Clear {active}
        </Button>
      ) : null}
      {onRefresh ? (
        <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto" aria-label="Refresh">
          <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}

const ANY = "__any";

/** A Select whose empty value means "no filter". */
export function SelectFilter({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
}) {
  const items: Record<string, string> = { [ANY]: `Any ${label.toLowerCase()}` };
  for (const o of options) items[o.value] = o.label;
  return (
    <Select
      value={value || ANY}
      items={items}
      onValueChange={(v) => onChange(v == null || v === ANY ? "" : String(v))}
    >
      <SelectTrigger size="sm" className={cn("min-w-36", value && "border-brand/50", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{items[ANY]}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Segmented time-range control (24h · 7d · 30d · 90d). */
export function TimeRangeTabs({
  value,
  onChange,
  presets = RANGE_PRESETS.map((p) => p.key),
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  presets?: readonly RangeKey[];
}) {
  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex h-7 items-center rounded-lg border border-border p-0.5">
      {RANGE_PRESETS.filter((p) => presets.includes(p.key)).map((p) => (
        <button
          key={p.key}
          type="button"
          role="radio"
          aria-checked={value === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "h-full rounded-[4px] px-2 text-xs font-medium tabular-nums transition-colors",
            value === p.key ? "bg-raised text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** A search box that commits on Enter / blur (so the URL isn't rewritten per keystroke). */
export function SearchFilter({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Follow external changes (e.g. "Clear") without an effect.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-faint" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(draft.trim());
        }}
        onBlur={() => {
          if (draft.trim() !== value) onCommit(draft.trim());
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 w-56 pl-7 font-mono text-xs"
      />
    </div>
  );
}
