"use client";

import { useMemo } from "react";

import { useUsage } from "@/features/projects/hooks";
import { burnSeries } from "@/features/usage/series";
import { percent, usd, usdAxis } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { TickMeter } from "@/components/charts/meters";
import { TimeChart } from "@/components/charts/time-chart";

const SERIES = [
  { key: "spent", label: "Billed so far", color: "var(--brand)" },
  { key: "pace", label: "At this pace", color: "var(--brand)", dashed: true },
];

const longDay = (p: string) => new Date(p).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * This month against the cap: what's been billed, and where a straight line from today's
 * pace lands. The projection is arithmetic, not a forecast, and it's labelled as a pace.
 */
export function BudgetBurn({ projectId, now, budget, className }: { projectId: string; now: number; budget: number | null; className?: string }) {
  const monthStart = useMemo(() => {
    const d = new Date(now);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  }, [now]);
  const usage = useUsage(projectId, { granularity: "day", groupBy: "none", from: monthStart, to: new Date(now).toISOString() });

  const buckets = usage.data?.buckets;
  const burn = useMemo(() => burnSeries(buckets ?? [], now, budget, longDay), [buckets, now, budget]);
  const references = useMemo(() => (budget ? [{ value: budget, label: `Cap ${usdAxis(budget)}`, color: "var(--error)" }] : []), [budget]);
  const ratio = budget ? burn.spent / budget : null;

  const headline =
    burn.projected === null
      ? "Too early in the month to read a pace."
      : burn.capDay
        ? `At this pace the cap is reached on ${longDay(burn.capDay)}.`
        : budget
          ? `At this pace the month ends near ${usd(burn.projected)}, ${percent(burn.projected / budget, 0)} of the cap.`
          : `At this pace the month ends near ${usd(burn.projected)}.`;

  return (
    <section className={`tile flex min-w-0 flex-col p-4 ${className ?? ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">Monthly budget</h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground">{usd(burn.spent)}</span>
          {budget ? ` of ${usd(budget)}` : " billed, no cap set"}
          {ratio !== null ? ` · ${percent(ratio, 0)}` : ""}
        </p>
      </div>
      {ratio !== null ? (
        <TickMeter
          className="mt-2.5"
          value={ratio}
          threshold={0.8}
          tone={ratio >= 1 ? "error" : ratio >= 0.8 ? "warning" : "brand"}
          label={`Budget ${Math.round(ratio * 100)}% used`}
        />
      ) : null}
      <div className="mt-3 flex-1">
        {usage.isLoading ? (
          <Skeleton className="h-44" />
        ) : (
          <TimeChart
            ariaLabel="Billed so far this month and the pace to month end"
            height={176}
            rows={burn.rows}
            series={SERIES}
            references={references}
            format={(v) => usd(v)}
            axisFormat={usdAxis}
            legend={false}
          />
        )}
      </div>
      <p className={`mt-2 text-xs ${burn.capDay ? "text-warning" : "text-muted-foreground"}`}>{headline}</p>
    </section>
  );
}
