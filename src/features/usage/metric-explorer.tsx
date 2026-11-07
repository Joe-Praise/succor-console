"use client";

import { useMemo, useState } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { priorByDay, stackBy, OTHERS_KEY, type GroupKey, type Metric } from "@/features/usage/series";
import type { UsageBucket } from "@/types";
import { BreakdownRows } from "@/components/charts/breakdown";
import { RollingNumber } from "@/components/charts/rolling-number";
import { Sparkline } from "@/components/charts/sparkline";
import { TimeChart } from "@/components/charts/time-chart";

export interface MetricDef {
  key: Metric;
  label: string;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  /** Which way is good news, for colouring the change. */
  goodWhen: "up" | "down" | "neutral";
  integer?: boolean;
  definition: string;
}

function Change({ value, goodWhen }: { value: number | null; goodWhen: MetricDef["goodWhen"] }) {
  if (value === null) return <span className="text-faint">no prior data</span>;
  const good = goodWhen === "neutral" ? null : goodWhen === "up" ? value >= 0 : value <= 0;
  const Icon = value >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tabular-nums", good === null ? "text-muted-foreground" : good ? "text-success" : "text-error")}>
      <Icon className="size-3" aria-hidden />
      {`${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`}
    </span>
  );
}

/**
 * One chart, four questions: pick a metric along the top and the chart and its breakdown morph
 * to it. Agents keep their colour and their place across metrics, ranked by what they cost.
 */
export function MetricExplorer({
  metrics,
  active,
  onActive,
  buckets,
  priorBuckets,
  days,
  priorDays,
  group,
  labelOf,
  hrefFor,
  periodLabel,
  totals,
  changes,
}: {
  metrics: MetricDef[];
  active: Metric;
  onActive: (m: Metric) => void;
  buckets: UsageBucket[];
  priorBuckets: UsageBucket[];
  days: string[];
  priorDays: string[];
  group: GroupKey;
  labelOf: (k: string) => string;
  hrefFor: (k: string) => string | undefined;
  periodLabel: (p: string) => string;
  totals: Record<Metric, number>;
  changes: Record<Metric, number | null>;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const def = metrics.find((m) => m.key === active) ?? metrics[0];
  const activeIndex = Math.max(0, metrics.findIndex((m) => m.key === def.key));
  const hasPrior = priorBuckets.length > 0;

  const stack = useMemo(
    () => stackBy(buckets, group, def.key, 5, labelOf, periodLabel, { days, rankBy: "billedUsd" }),
    [buckets, group, def.key, labelOf, periodLabel, days],
  );
  const rows = useMemo(() => {
    const prior = hasPrior ? priorByDay(priorBuckets, def.key, priorDays) : null;
    return stack.data.map((r, i) => ({ ...r, prior: prior?.[i] ?? null }));
  }, [stack.data, priorBuckets, priorDays, def.key, hasPrior]);

  const trends = useMemo(() => {
    const byMetric = {} as Record<Metric, number[]>;
    for (const m of metrics) byMetric[m.key] = priorByDay(buckets, m.key, days);
    return byMetric;
  }, [metrics, buckets, days]);

  const breakdown = stack.legend.map((l) => ({
    ...l,
    href: l.key === OTHERS_KEY ? undefined : hrefFor(l.key),
    spark: stack.data.map((r) => Number(r[l.key] ?? 0)),
  }));

  return (
    <section className="tile min-w-0 overflow-hidden">
      <div role="tablist" aria-label="Metric" className="relative grid grid-cols-2 border-b border-hairline lg:grid-cols-4">
        {metrics.map((m) => {
          const selected = m.key === def.key;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={selected}
              title={m.definition}
              onClick={() => onActive(m.key)}
              className={cn(
                "group min-w-0 border-hairline px-4 py-3 text-left transition-colors not-last:border-r",
                selected ? "bg-foreground/2.5" : "hover:bg-foreground/1.5",
              )}
            >
              <span className={cn("block text-xs font-medium transition-colors", selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{m.label}</span>
              <span className="mt-1 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xl leading-7 font-semibold tracking-tight text-foreground">
                  <RollingNumber value={m.format(totals[m.key])} />
                </span>
                <Sparkline values={trends[m.key]} color={selected ? "var(--brand)" : "var(--text-tertiary)"} className="hidden! w-16! shrink-0 sm:block!" />
              </span>
              <span className="mt-0.5 block text-[11px]">
                <Change value={changes[m.key]} goodWhen={m.goodWhen} />
              </span>
            </button>
          );
        })}
        <span
          className="tab-ink hidden h-0.5! lg:block"
          style={{ width: `${100 / metrics.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden
        />
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {buckets.length === 0 ? (
          <p className="grid h-72 place-items-center text-sm text-faint lg:col-span-2">No usage in this window.</p>
        ) : (
          <>
            <TimeChart
              ariaLabel={`${def.label} per day, stacked by ${group === "model" ? "model" : "agent"}`}
              height={288}
              rows={rows}
              series={stack.series}
              stacked
              ghost={hasPrior ? { key: "prior", label: "Previous period, total" } : undefined}
              legend="keys"
              highlight={focus}
              format={def.format}
              axisFormat={def.axisFormat}
              integer={def.integer}
              tickCount={4}
            />
            <div className="flex min-w-0 flex-col justify-center">
              <p className="mb-1.5 px-1.5 text-[11px] text-faint">
                {def.label} by {group === "model" ? "model" : "agent"}
              </p>
              <BreakdownRows rows={breakdown} format={def.format} active={focus} onActive={setFocus} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
