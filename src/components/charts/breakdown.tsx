"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

export interface BreakdownRow {
  key: string;
  label: string;
  value: number;
  color: string;
  href?: string;
  /** This row's own trend. Each sparkline fits its own range, so it shows shape, not size. */
  spark?: Array<number | null>;
}

/** Who makes up the total: a key, a name, a trend, the amount and its share. Hovering a row brings it forward. */
export function BreakdownRows({
  rows,
  format,
  active,
  onActive,
  share = true,
  className,
}: {
  rows: BreakdownRow[];
  format: (v: number) => string;
  active?: string | null;
  onActive?: (key: string | null) => void;
  share?: boolean;
  className?: string;
}) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  const hasSpark = rows.some((r) => r.spark);
  return (
    <ul className={cn("text-xs", className)} onPointerLeave={() => onActive?.(null)}>
      {rows.map((r) => {
        const pct = total > 0 ? (r.value / total) * 100 : 0;
        const label = <span className="block truncate">{r.label}</span>;
        return (
          <li
            key={r.key}
            onPointerEnter={() => onActive?.(r.key)}
            className={cn(
              "chart-emphasis relative grid h-7 items-center gap-2 overflow-hidden rounded-[4px] px-1.5",
              hasSpark ? "grid-cols-[10px_minmax(0,1fr)_52px_auto_38px]" : "grid-cols-[10px_minmax(0,1fr)_auto_38px]",
              !share && (hasSpark ? "grid-cols-[10px_minmax(0,1fr)_52px_auto]" : "grid-cols-[10px_minmax(0,1fr)_auto]"),
            )}
            style={{ opacity: active && active !== r.key ? 0.45 : 1 }}
          >
            <span className="meter-fill absolute inset-y-0 left-0 bg-foreground/4" style={{ width: `${pct}%` }} aria-hidden />
            <span className="relative h-0.5 w-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
            {r.href ? (
              <Link href={r.href} className="relative min-w-0 text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </Link>
            ) : (
              <span className="relative min-w-0 text-muted-foreground">{label}</span>
            )}
            {hasSpark ? <Sparkline values={r.spark ?? []} color={r.color} wash={false} dot={false} className="relative h-4!" /> : null}
            <span className="relative text-foreground tabular-nums">{format(r.value)}</span>
            {share ? <span className="relative text-right text-faint tabular-nums">{total > 0 ? `${pct.toFixed(pct < 10 ? 1 : 0)}%` : "—"}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
