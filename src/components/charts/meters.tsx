"use client";

import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  brand: "var(--brand)",
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
};

/** A ratio against a limit, drawn as fine ticks. An optional mark shows where it starts to matter. */
export function TickMeter({
  value,
  threshold,
  tone = "brand",
  height = 10,
  label,
  className,
}: {
  /** 0 to 1. Anything past 1 fills the meter. */
  value: number;
  threshold?: number;
  tone?: keyof typeof TONE;
  height?: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="tick-mask absolute inset-0">
        <div className="absolute inset-0 bg-strong/70" />
        <div className="meter-fill absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: TONE[tone] }} />
      </div>
      {threshold !== undefined ? (
        <span className="absolute -inset-y-0.5 w-px bg-foreground/55" style={{ left: `${threshold * 100}%` }} aria-hidden />
      ) : null}
    </div>
  );
}

/** Parts of a whole on the same fine ticks, each part its own colour. */
export function SegmentTicks({
  rows,
  active,
  height = 12,
  className,
}: {
  rows: Array<{ key: string; value: number; color: string }>;
  active?: string | null;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("tick-mask spark-wipe flex w-full gap-1", className)} style={{ height }} aria-hidden>
      {rows.map((r) => (
        <span
          key={r.key}
          className="chart-emphasis block"
          style={{ flexGrow: r.value, flexBasis: 0, minWidth: 4, background: r.color, opacity: active && active !== r.key ? 0.22 : 1 }}
        />
      ))}
    </div>
  );
}
