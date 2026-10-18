import type { UsageBucket } from "@/types";
import { FAILED_RUN_STATUSES } from "@/lib/status";
import { SERIES_COLORS, OTHERS_COLOR } from "@/components/ops/charts";

/**
 * Pure transforms from GET /projects/:id/usage buckets (period × agent|model) into
 * the shapes the usage explorer draws. No fetching, no formatting of money.
 */

export type GroupKey = "agentType" | "model";
export type Metric = "billedUsd" | "costUsd" | "runs" | "tokens";

export function metricOf(b: UsageBucket, metric: Metric): number {
  if (metric === "tokens") return b.inputTokens + b.outputTokens + b.embeddingTokens;
  return b[metric];
}

export interface Totals {
  runs: number;
  costUsd: number;
  billedUsd: number;
  tokens: number;
  failed: number;
}

export function totalsOf(buckets: UsageBucket[]): Totals {
  const t: Totals = { runs: 0, costUsd: 0, billedUsd: 0, tokens: 0, failed: 0 };
  for (const b of buckets) {
    t.runs += b.runs;
    t.costUsd += b.costUsd;
    t.billedUsd += b.billedUsd;
    t.tokens += b.inputTokens + b.outputTokens + b.embeddingTokens;
    for (const [status, n] of Object.entries(b.statuses ?? {})) {
      if (FAILED_RUN_STATUSES.has(status)) t.failed += n;
    }
  }
  return t;
}

export interface StackedSeries {
  /** One row per period: { period, label, <seriesKey>: value, … }. */
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; color: string }>;
  legend: Array<{ key: string; label: string; value: number; color: string }>;
}

const OTHERS = "__others";

/**
 * Stack a metric by agent or model per period, keeping the top `topN` groups (by
 * total over the window) and folding the rest into "Others" so the chart stays
 * legible. Periods with no data in a group get an explicit 0.
 */
export function stackBy(
  buckets: UsageBucket[],
  group: GroupKey,
  metric: Metric,
  topN = 5,
  labelOf: (key: string) => string = (k) => k,
  periodLabel: (period: string) => string = (p) => p.slice(5, 10),
): StackedSeries {
  const totals = new Map<string, number>();
  for (const b of buckets) {
    const k = (group === "agentType" ? b.agentType : b.model) ?? "unknown";
    totals.set(k, (totals.get(k) ?? 0) + metricOf(b, metric));
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, topN).map(([k]) => k);
  const hasOthers = ranked.length > topN;

  const periods = [...new Set(buckets.map((b) => b.period))].sort();
  const rows = new Map<string, Record<string, string | number>>();
  for (const p of periods) {
    const row: Record<string, string | number> = { period: p, label: periodLabel(p) };
    for (const k of top) row[k] = 0;
    if (hasOthers) row[OTHERS] = 0;
    rows.set(p, row);
  }
  for (const b of buckets) {
    const k = (group === "agentType" ? b.agentType : b.model) ?? "unknown";
    const row = rows.get(b.period)!;
    const slot = top.includes(k) ? k : OTHERS;
    row[slot] = (row[slot] as number) + metricOf(b, metric);
  }

  const series = top.map((k, i) => ({ key: k, label: labelOf(k), color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  if (hasOthers) series.push({ key: OTHERS, label: "Others", color: OTHERS_COLOR });
  const othersTotal = ranked.slice(topN).reduce((s, [, v]) => s + v, 0);
  const legend = [
    ...top.map((k, i) => ({ key: k, label: labelOf(k), value: totals.get(k) ?? 0, color: SERIES_COLORS[i % SERIES_COLORS.length] })),
    ...(hasOthers ? [{ key: OTHERS, label: "Others", value: othersTotal, color: OTHERS_COLOR }] : []),
  ];
  return { data: [...rows.values()], series, legend };
}

export const OTHERS_KEY = OTHERS;
