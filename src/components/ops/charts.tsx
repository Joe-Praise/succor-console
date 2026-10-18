"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";

/**
 * Chart primitives on the design tokens. Outcome charts use --success/--error;
 * categorical series (agents, models) use --chart-1..6, which deliberately avoid
 * the outcome hues so a series never reads as "good" or "bad".
 */

export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
export const OTHERS_COLOR = "var(--text-tertiary)";

const axisTick = { fill: "var(--chart-axis)", fontSize: 11 };

export const tooltipStyle = {
  contentStyle: {
    background: "var(--overlay)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--foreground)",
    boxShadow: "var(--shadow-md)",
  },
  labelStyle: { color: "var(--text-secondary)", marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", padding: 0 },
  cursor: { fill: "var(--raised)", opacity: 0.6 },
} as const;

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

/** Stacked bars over a category axis (dates). Pure presentation — data is pre-shaped. */
export function StackedBars({
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
  line,
  className,
}: {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  series: SeriesDef[];
  height?: number;
  valueFormatter?: (v: number) => string;
  /** Optional overlay line on a right axis (e.g. average duration). */
  line?: { key: string; label: string; formatter?: (v: number) => string };
  className?: string;
}) {
  const fmt = (v: unknown) => (typeof v === "number" ? (valueFormatter ? valueFormatter(v) : v.toLocaleString()) : String(v));
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: line ? 4 : 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis
            yAxisId="v"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : v.toLocaleString())}
          />
          {line ? (
            <YAxis
              yAxisId="l"
              orientation="right"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => (line.formatter ? line.formatter(v) : String(v))}
            />
          ) : null}
          <Tooltip
            {...tooltipStyle}
            formatter={(value, name) => {
              const isLine = line && name === line.label;
              const v = typeof value === "number" ? value : Number(value);
              return [isLine && line.formatter ? line.formatter(v) : fmt(v), name];
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              yAxisId="v"
              dataKey={s.key}
              name={s.label}
              stackId="a"
              fill={s.color}
              radius={i === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />
          ))}
          {line ? (
            <Line
              yAxisId="l"
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke="var(--info)"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Plain single-series bars (kept for simple trends). */
export function SimpleBars({
  data,
  xKey,
  yKey,
  height = 200,
  valueFormatter,
}: {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  yKey: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : v.toLocaleString())}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(v) => (typeof v === "number" && valueFormatter ? valueFormatter(v) : String(v))}
          />
          <Bar dataKey={yKey} fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut with a centered total. */
export function Donut({
  data,
  total,
  centerLabel,
  size = 168,
}: {
  data: Array<{ key: string; label: string; value: number; color: string }>;
  total: React.ReactNode;
  centerLabel?: string;
  size?: number;
}) {
  const nonEmpty = data.some((d) => d.value > 0);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonEmpty ? data : [{ key: "empty", label: "No data", value: 1, color: "var(--raised)" }]}
            dataKey="value"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {(nonEmpty ? data : [{ key: "empty", color: "var(--raised)" }]).map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          {nonEmpty ? <Tooltip {...tooltipStyle} /> : null}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-lg font-semibold text-foreground tabular-nums">{total}</p>
          {centerLabel ? <p className="text-[11px] text-faint">{centerLabel}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Legend rows: color, label, value, share — the AI/ML-usage-style breakdown. */
export function LegendTable({
  rows,
  formatter,
}: {
  rows: Array<{ key: string; label: string; value: number; color: string; href?: string }>;
  formatter: (v: number) => string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-1.5 text-xs">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
          {r.href ? (
            <Link href={r.href} className="min-w-0 flex-1 truncate font-mono text-muted-foreground hover:text-foreground">
              {r.label}
            </Link>
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{r.label}</span>
          )}
          <span className="tabular-nums text-foreground">{formatter(r.value)}</span>
          <span className="w-12 text-right tabular-nums text-faint">
            {total > 0 ? `${((r.value / total) * 100).toFixed(1)}%` : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
