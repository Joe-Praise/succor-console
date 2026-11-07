import type { UsageBucket } from "@/types";
import { FAILED_RUN_STATUSES } from "@/lib/status";
import { SERIES_COLORS, OTHERS_COLOR } from "@/components/charts/geometry";

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
const DAY_MS = 86_400_000;

/** Every UTC day from the first bound to the last, inclusive, as YYYY-MM-DD. */
export function dayKeys(from: string | Date, to: string | Date): string[] {
  const start = new Date(from);
  const end = new Date(to).getTime();
  const out: string[] = [];
  for (let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()); t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export interface StackOptions {
  /** Every day to show, so a quiet day is an explicit zero and the time axis stays true. */
  days?: string[];
  /** Choose the named groups and their colours by this metric, so an agent keeps both whichever metric is showing. */
  rankBy?: Metric;
}

/**
 * Stack a metric by agent or model per period, keeping the top `topN` groups (by
 * total over the window) and folding the rest into "Others" so the chart stays
 * legible. Periods with no data in a group get an explicit 0. Colour follows the group's
 * rank, not the metric's, when `rankBy` is set; the legend always sorts by what's shown.
 */
export function stackBy(
  buckets: UsageBucket[],
  group: GroupKey,
  metric: Metric,
  topN = 5,
  labelOf: (key: string) => string = (k) => k,
  periodLabel: (period: string) => string = (p) => p.slice(5, 10),
  opts: StackOptions = {},
): StackedSeries {
  const groupOf = (b: UsageBucket) => (group === "agentType" ? b.agentType : b.model) ?? "unknown";
  // The API returns each period as a full timestamp; a day list matches on the date alone.
  const periodOf = (b: UsageBucket) => (opts.days ? b.period.slice(0, 10) : b.period);
  const totals = new Map<string, number>();
  const rankTotals = new Map<string, number>();
  for (const b of buckets) {
    const k = groupOf(b);
    totals.set(k, (totals.get(k) ?? 0) + metricOf(b, metric));
    rankTotals.set(k, (rankTotals.get(k) ?? 0) + metricOf(b, opts.rankBy ?? metric));
  }
  const ranked = [...rankTotals.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, topN).map(([k]) => k);
  const hasOthers = ranked.length > topN;

  const periods = [...new Set([...(opts.days ?? []), ...buckets.map(periodOf)])].sort();
  const rows = new Map<string, Record<string, string | number>>();
  for (const p of periods) {
    const row: Record<string, string | number> = { period: p, label: periodLabel(p) };
    for (const k of top) row[k] = 0;
    if (hasOthers) row[OTHERS] = 0;
    rows.set(p, row);
  }
  for (const b of buckets) {
    const k = groupOf(b);
    const row = rows.get(periodOf(b))!;
    const slot = top.includes(k) ? k : OTHERS;
    row[slot] = (row[slot] as number) + metricOf(b, metric);
  }

  const series = top.map((k, i) => ({ key: k, label: labelOf(k), color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  if (hasOthers) series.push({ key: OTHERS, label: "Others", color: OTHERS_COLOR });
  const othersTotal = ranked.slice(topN).reduce((s, [k]) => s + (totals.get(k) ?? 0), 0);
  const legend = [
    ...top
      .map((k, i) => ({ key: k, label: labelOf(k), value: totals.get(k) ?? 0, color: SERIES_COLORS[i % SERIES_COLORS.length] }))
      .sort((a, b) => b.value - a.value),
    ...(hasOthers ? [{ key: OTHERS, label: "Others", value: othersTotal, color: OTHERS_COLOR }] : []),
  ];
  return { data: [...rows.values()], series, legend };
}

/** The previous window's daily totals, one per day, to line up with the current window by position. */
export function priorByDay(buckets: UsageBucket[], metric: Metric, days: string[]): number[] {
  const byDay = new Map<string, number>();
  for (const b of buckets) {
    const d = b.period.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + metricOf(b, metric));
  }
  return days.map((d) => byDay.get(d) ?? 0);
}

export interface BurnRow {
  [key: string]: string | number | null;
  period: string;
  label: string;
  /** Billed so far this month, up to today. */
  spent: number | null;
  /** Where today's pace would land. A straight line, and labelled as one. */
  pace: number | null;
}

export interface Burn {
  rows: BurnRow[];
  spent: number;
  /** Month-end total at today's pace, or null while there's too little of the month to judge. */
  projected: number | null;
  /** The first day the pace crosses the cap, if it does. */
  capDay: string | null;
}

/** Fewer days than this and a daily rate is mostly noise, so no projection is drawn. */
const MIN_DAYS_TO_PROJECT = 3;

/** This UTC month's cumulative billing, and where the current pace would take it. */
export function burnSeries(buckets: UsageBucket[], now: number, cap: number | null, periodLabel: (period: string) => string): Burn {
  const d = new Date(now);
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
  const days = dayKeys(new Date(monthStart), new Date(monthEnd));
  const today = new Date(now).toISOString().slice(0, 10);
  const todayIndex = days.indexOf(today);
  const byDay = new Map<string, number>();
  for (const b of buckets) {
    const key = b.period.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + b.billedUsd);
  }
  const elapsed = (now - monthStart) / DAY_MS;
  const spent = days.reduce((sum, day) => (day <= today ? sum + (byDay.get(day) ?? 0) : sum), 0);
  const rate = elapsed >= MIN_DAYS_TO_PROJECT ? spent / elapsed : null;

  let running = 0;
  let capDay: string | null = null;
  const rows = days.map((day, i): BurnRow => {
    const past = day <= today;
    if (past) running += byDay.get(day) ?? 0;
    const ahead = i - todayIndex;
    const pace = rate !== null && ahead >= 0 ? spent + rate * ahead : null;
    if (cap !== null && capDay === null && pace !== null && pace >= cap) capDay = day;
    return { period: day, label: periodLabel(day), spent: past ? running : null, pace };
  });
  return { rows, spent, projected: rate !== null ? rows[rows.length - 1].pace : null, capDay };
}

export const OTHERS_KEY = OTHERS;
