import type { OpsSummary } from "@/types";
import { JOB_STATUSES, toneOf, type Tone } from "@/lib/status";

/**
 * Pure transforms from GET /portal/projects/:id/ops-summary into what the operations
 * overview draws. Nothing here invents a value: a rate with no denominator is null,
 * and days with no recorded runs are explicit zeros, never interpolated.
 */

const DAY_MS = 86_400_000;

export const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--text-secondary)",
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  faint: "var(--text-tertiary)",
  brand: "var(--brand)",
};

export interface DayPoint {
  date: string;
  label: string;
  succeeded: number;
  failed: number;
  other: number;
  avgDurationMs: number | null;
}

/** One row per UTC day in [from, to], zero-filled where the summary has no runs. */
export function fillDaily(daily: OpsSummary["daily"], from: Date | string, to: Date | string): DayPoint[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const start = new Date(from);
  const cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const end = new Date(to).getTime();
  const out: DayPoint[] = [];
  for (let t = cursor; t <= end; t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    const d = byDate.get(date);
    out.push({
      date,
      label: new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      succeeded: d?.succeeded ?? 0,
      failed: d?.failed ?? 0,
      other: d?.other ?? 0,
      avgDurationMs: d?.avgDurationMs ?? null,
    });
  }
  return out;
}

/** Share of priced runs that succeeded; null when there were none to divide. */
export function successRate(runs: OpsSummary["runs"]): number | null {
  return runs.total > 0 ? runs.succeeded / runs.total : null;
}

/** Callback deliveries that will not arrive without intervention. */
export function undeliverable(deliveries: OpsSummary["deliveries"]): number {
  return (deliveries.byStatus.dead ?? 0) + (deliveries.byStatus.failed ?? 0);
}

const JOB_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  dead: "Dead",
  pending_approval: "Awaiting approval",
  rejected: "Rejected",
};

/** Donut slices for jobs created in the window, in lifecycle order; empty statuses dropped. */
export function jobSlices(jobs: Record<string, number>) {
  const known = JOB_STATUSES.filter((s) => (jobs[s] ?? 0) > 0).map((s) => ({
    key: s,
    label: JOB_LABEL[s] ?? s,
    value: jobs[s],
    color: TONE_COLOR[toneOf(s)],
  }));
  // A status the console doesn't know yet still counts — shown, not dropped.
  const unknown = Object.entries(jobs)
    .filter(([s, n]) => n > 0 && !(JOB_STATUSES as readonly string[]).includes(s))
    .map(([s, n]) => ({ key: s, label: s, value: n, color: TONE_COLOR.neutral }));
  return [...known, ...unknown];
}
