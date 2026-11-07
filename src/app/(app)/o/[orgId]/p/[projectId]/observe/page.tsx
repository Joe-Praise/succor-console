"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks, useCurrentUsage, useUsage } from "@/features/projects/hooks";
import { useOpsSummary, useRuns, useUsageRecords } from "@/features/executions/hooks";
import { fillDaily, jobSlices, successRate, TONE_COLOR, undeliverable, type DayPoint } from "@/features/executions/ops";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { dayKeys, stackBy } from "@/features/usage/series";
import { useUrlFilters } from "@/lib/url-filters";
import { isoDay, isRangeKey, previousBounds, rangeBounds, type RangeKey } from "@/lib/time-range";
import { FAILED_RUN_STATUSES, toneOf } from "@/lib/status";
import { compactNumber, dateTime, delta, duration, durationAxis, percent, relativeTime, shortId, tokens as fmtTokens, usd, usdAxis } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { HttpStatus, MethodMark, StatBand, ToneDot, Widget } from "@/components/ops/primitives";
import { BreakdownRows } from "@/components/charts/breakdown";
import { SegmentTicks, TickMeter } from "@/components/charts/meters";
import { RunScatter, type ScatterPoint } from "@/components/charts/run-scatter";
import { Sparkline } from "@/components/charts/sparkline";
import { TimeChart } from "@/components/charts/time-chart";
import { FilterBar, TimeRangeTabs } from "@/components/ops/filters";

const URL_KEYS = ["range"] as const;
const SYNC = "observe";

const dayLabel = (p: string) => new Date(p).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const scatterDay = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const OUTCOME_SERIES = [
  { key: "succeeded", label: "Succeeded", color: "var(--success)" },
  { key: "other", label: "Other", color: "var(--text-tertiary)" },
  { key: "failed", label: "Failed", color: "var(--error)", side: "down" as const },
];
const RATE_SERIES = [{ key: "rate", label: "Success rate", color: "var(--success)" }];
const SUCCESS_DOMAIN: [number | "auto", number] = ["auto", 1];
const formatRate = (v: number) => percent(v, v > 0 && v < 1 ? 1 : 0);
const rateOf = (d: DayPoint) => {
  const total = d.succeeded + d.failed + d.other;
  return total ? d.succeeded / total : null;
};

function changeNote(d: number | null): string | undefined {
  if (d === null) return undefined;
  return `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)}% vs prior`;
}

/** The latest things that went wrong: dead or rejected runs and failed callbacks. */
function ErrorFeed({ base, projectId }: { base: string; projectId: string }) {
  const { nameOf } = useAgentNames(projectId);
  const failed = useRuns(projectId, { status: "dead,rejected", limit: 8 });
  const callbacks = useCallbacks(projectId, 8, false);

  const rows = useMemo(() => {
    const a = (failed.data?.pages[0]?.jobs ?? []).map((r) => ({
      key: `r${r.id}`,
      ts: r.updatedAt,
      href: `${base}/runs/${r.id}`,
      left: <span className="w-10 shrink-0 font-mono text-[11px] text-faint">run</span>,
      status: (
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-error">
          <ToneDot tone={toneOf(r.status)} />
          {r.status}
        </span>
      ),
      where: nameOf(r.agentType),
      detail: r.lastError ?? shortId(r.id),
    }));
    const b = (callbacks.data?.deliveries ?? []).map((d) => {
      const id = d.id ?? d._id ?? "";
      return {
        key: `d${id}`,
        ts: d.ts,
        href: `${base}/callbacks/${id}`,
        left: <MethodMark method={d.method} />,
        status: <HttpStatus status={d.responseStatus} ok={false} />,
        where: nameOf(d.agentType),
        detail: d.errorMessage ?? d.url,
      };
    });
    return [...a, ...b].sort((x, y) => y.ts.getTime() - x.ts.getTime()).slice(0, 10);
  }, [failed.data, callbacks.data, base, nameOf]);

  const loading = failed.isLoading || callbacks.isLoading;
  return (
    <Widget
      title="Errors"
      hint="Runs that were dead-lettered or rejected, and callback attempts that failed. Newest first."
      href={`${base}/requests?result=failed`}
      className="lg:col-span-2"
      bodyClassName="p-0"
      action={rows.length ? <span className="font-mono text-[11px] text-faint tabular-nums">{rows.length} latest</span> : null}
    >
      {loading ? (
        <Skeleton className="m-3 h-28" />
      ) : rows.length === 0 ? (
        <p className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted-foreground">
          <CircleCheckIcon className="size-4 text-success" aria-hidden />
          No failed runs or callbacks recorded.
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto font-mono text-[11.5px]">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="grid grid-cols-[64px_34px_minmax(0,88px)_minmax(0,130px)_minmax(0,1fr)] items-center gap-3 border-b border-hairline px-3 py-1.5 transition-colors last:border-0 hover:bg-raised">
                <span className="truncate text-faint tabular-nums">{relativeTime(r.ts)}</span>
                {r.left}
                <span className="truncate">{r.status}</span>
                <span className="truncate font-sans text-xs text-foreground">{r.where}</span>
                <span className="truncate text-muted-foreground">{r.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

function ObserveDashboard() {
  const { orgId, projectId } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const { nameOf } = useAgentNames(projectId);
  const range: RangeKey = isRangeKey(values.range) ? values.range : "7d";
  const [now, setNow] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);
  const prev = previousBounds(bounds);
  const base = `/o/${orgId}/p/${projectId}`;

  const summary = useOpsSummary(projectId, { from: bounds.from, to: bounds.to });
  const prevSummary = useOpsSummary(projectId, { from: prev.from, to: prev.to });
  const usageNow = useCurrentUsage(projectId);
  const usage = useUsage(projectId, { granularity: "day", groupBy: "agent", from: isoDay(bounds.from), to: isoDay(bounds.to) });
  const usageFlat = useUsage(projectId, { granularity: "day", groupBy: "none", from: isoDay(bounds.from), to: isoDay(bounds.to) });
  const records = useUsageRecords(projectId, { from: bounds.from, to: bounds.to, limit: 200 });
  const [spendFocus, setSpendFocus] = useState<string | null>(null);

  const s = summary.data;
  const p = prevSummary.data;
  const rate = s ? successRate(s.runs) : null;
  const prevRate = p ? successRate(p.runs) : null;
  const days = useMemo(() => (s ? fillDaily(s.daily, s.from, s.to) : []), [s]);
  const prevDays = useMemo(() => (p ? fillDaily(p.daily, p.from, p.to) : []), [p]);
  const live = s ? (s.live["queued"] ?? 0) + (s.live["running"] ?? 0) : 0;
  const lost = s ? undeliverable(s.deliveries) : 0;
  const budget = usageNow.data?.monthlyBudgetUsd ?? null;
  const budgetPct = budget && usageNow.data ? usageNow.data.billedUsd / budget : null;
  const hasRuns = days.some((d) => d.succeeded + d.failed + d.other > 0);

  const outcomeRows = useMemo(() => days.map((d, i) => ({ ...d, prior: prevDays[i] ? prevDays[i].succeeded + prevDays[i].other : null })), [days, prevDays]);
  const rateRows = useMemo(() => days.map((d, i) => ({ label: d.label, rate: rateOf(d), prior: prevDays[i] ? rateOf(prevDays[i]) : null })), [days, prevDays]);
  const usageDays = useMemo(() => dayKeys(bounds.from, bounds.to), [bounds.from, bounds.to]);
  const spend = useMemo(
    () => stackBy(usage.data?.buckets ?? [], "agentType", "billedUsd", 5, nameOf, dayLabel, { days: usageDays }),
    [usage.data, nameOf, usageDays],
  );
  const spendRows = spend.legend.map((l) => ({
    ...l,
    href: l.key === "__others" ? undefined : `${base}/runs?agent=${l.key}&range=${range}`,
    spark: spend.data.map((r) => Number(r[l.key] ?? 0)),
  }));
  const tokenRows = useMemo(() => {
    const buckets = [...(usageFlat.data?.buckets ?? [])].sort((a, b) => a.period.localeCompare(b.period));
    const pick = (read: (b: (typeof buckets)[number]) => number) => buckets.map(read);
    return [
      { key: "input", label: "Input", color: "var(--chart-2)", spark: pick((b) => b.inputTokens) },
      { key: "output", label: "Output", color: "var(--chart-3)", spark: pick((b) => b.outputTokens) },
      { key: "embedding", label: "Embedding", color: "var(--chart-4)", spark: pick((b) => b.embeddingTokens) },
    ].map((r) => ({ ...r, value: r.spark.reduce((n, v) => n + v, 0) }));
  }, [usageFlat.data]);
  const firstPage = records.data?.pages[0];
  const points = useMemo<ScatterPoint[]>(
    () =>
      (firstPage?.records ?? []).flatMap((r) =>
        r.durationMs === null
          ? []
          : [
              {
                id: r.id,
                ts: r.ts.getTime(),
                value: r.durationMs,
                failed: FAILED_RUN_STATUSES.has(r.status),
                title: dateTime(r.ts),
                detail: `${nameOf(r.agentType)} · ${r.billedUsd === null ? "not billed" : usd(r.billedUsd)}`,
                href: `${base}/logs/${r.id}`,
              },
            ],
      ),
    [firstPage, nameOf, base],
  );
  const durationRefs = useMemo(
    () => [
      ...(s?.durationMs.p50 != null ? [{ value: s.durationMs.p50, label: `p50 ${duration(s.durationMs.p50)}` }] : []),
      ...(s?.durationMs.p95 != null ? [{ value: s.durationMs.p95, label: `p95 ${duration(s.durationMs.p95)}` }] : []),
    ],
    [s],
  );
  const spark = {
    rate: days.map(rateOf),
    runs: days.map((d) => d.succeeded + d.failed + d.other),
    duration: days.map((d) => d.avgDurationMs),
  };
  const refreshing = summary.isPlaceholderData || usage.isPlaceholderData;
  const slices = s ? jobSlices(s.jobs) : [];
  const deliveryRows = s
    ? Object.entries(s.deliveries.byStatus)
        .filter(([, n]) => n > 0)
        .map(([key, value]) => ({ key, label: key, value, color: TONE_COLOR[toneOf(key)] }))
    : [];
  const empty = (msg: string) => <p className="grid h-48 place-items-center text-[13px] text-faint">{msg}</p>;
  const skeleton = <Skeleton className="h-48" />;

  return (
    <div className="settle-in space-y-3">
      <PageHeader size="compact" title="Dashboard" description="How this project is running: outcomes, durations, spend and what went wrong." />

      <FilterBar
        onRefresh={() => {
          setNow(Date.now());
          void summary.refetch();
          void usage.refetch();
          void usageFlat.refetch();
        }}
        refreshing={summary.isFetching}
      >
        <TimeRangeTabs value={range} onChange={(v) => set({ range: v === "7d" ? null : v })} />
        {s?.runs.truncated ? <span className="text-xs text-warning">Rates and durations use the most recent 10,000 priced runs in this window.</span> : null}
      </FilterBar>

      {summary.isError ? (
        <QueryError message="Couldn't load the operations summary." onRetry={() => void summary.refetch()} />
      ) : (
        <StatBand
          stats={[
            {
              label: "Success rate",
              value: rate === null ? "—" : percent(rate),
              sub: changeNote(rate !== null && prevRate !== null ? delta(rate, prevRate) : null) ?? (s ? `${compactNumber(s.runs.succeeded)} of ${compactNumber(s.runs.total)}` : undefined),
              hint: "Priced runs whose agent returned success, out of all priced runs in the window.",
              visual: <Sparkline values={spark.rate} color="var(--success)" />,
            },
            {
              label: "Runs",
              value: s ? compactNumber(s.runs.total) : "—",
              sub: changeNote(s && p && p.runs.total ? delta(s.runs.total, p.runs.total) : null) ?? `last ${range}`,
              href: `${base}/runs?range=${range}`,
              visual: <Sparkline values={spark.runs} color="var(--chart-2)" />,
            },
            { label: "Live now", value: String(live), sub: "queued + running", tone: live ? "info" : undefined, href: `${base}/runs?status=queued%2Crunning` },
            {
              label: "Awaiting approval",
              value: String(s?.live["pending_approval"] ?? 0),
              sub: "held deliveries",
              tone: s?.live["pending_approval"] ? "warning" : undefined,
              href: `${base}/approvals`,
            },
            {
              label: "Undeliverable",
              value: String(lost),
              sub: s?.deliveries.outcomeUnknown ? `${s.deliveries.outcomeUnknown} outcome unknown` : "dead or failed",
              tone: lost ? "error" : undefined,
              href: `${base}/callbacks?result=failed`,
              hint: "Callbacks that ended dead (retries exhausted) or failed (permanent, e.g. a 4xx). Scheduled retries aren't counted.",
            },
            {
              label: "p95 duration",
              value: duration(s?.durationMs.p95),
              sub: s?.durationMs.p50 != null ? `p50 ${duration(s.durationMs.p50)}` : undefined,
              hint: "Agent execution time on each priced run. Excludes queue wait and delivery.",
              visual: <Sparkline values={spark.duration} color="var(--chart-4)" />,
            },
            {
              label: "Budget used",
              value: budgetPct === null ? "—" : percent(budgetPct, 0),
              sub: budget ? `${usd(usageNow.data?.billedUsd)} of ${usd(budget)}` : "no cap set",
              tone: budgetPct !== null && budgetPct >= 0.8 ? "warning" : undefined,
              href: `${base}/usage`,
              visual: budgetPct !== null ? <TickMeter value={budgetPct} threshold={0.8} tone={budgetPct >= 1 ? "error" : budgetPct >= 0.8 ? "warning" : "brand"} height={8} /> : undefined,
            },
          ]}
        />
      )}

      <div className={cn("grid gap-3 transition-opacity duration-200 lg:grid-cols-3", refreshing && "opacity-60")}>
        <Widget
          title="Runs by outcome"
          hint="Priced runs per UTC day. Succeeded and other above the line, failed below. The faint line is the same stretch of the previous period."
          href={`${base}/runs?range=${range}`}
          className="lg:col-span-2"
          action={s ? <span className="font-mono text-[11px] text-faint tabular-nums">{compactNumber(s.runs.total)} runs · {compactNumber(s.runs.failed)} failed</span> : null}
        >
          {summary.isLoading ? (
            skeleton
          ) : !hasRuns ? (
            empty("No priced runs in this window")
          ) : (
            <TimeChart
              ariaLabel="Runs by outcome per day"
              syncId={SYNC}
              height={208}
              rows={outcomeRows}
              series={OUTCOME_SERIES}
              ghost={prevDays.length ? { key: "prior", label: "Previous period" } : undefined}
              format={compactNumber}
              integer
            />
          )}
        </Widget>

        <Widget title="Success rate" hint="Succeeded runs out of all priced runs, per UTC day. The axis is zoomed to the data. Days with no runs are gaps.">
          {summary.isLoading ? (
            skeleton
          ) : !hasRuns ? (
            empty("Nothing to divide yet")
          ) : (
            <TimeChart
              ariaLabel="Success rate per day"
              syncId={SYNC}
              height={208}
              rows={rateRows}
              series={RATE_SERIES}
              ghost={prevDays.length ? { key: "prior", label: "Previous period" } : undefined}
              domain={SUCCESS_DOMAIN}
              format={formatRate}
              endValue
            />
          )}
        </Widget>

        <Widget
          title="Run durations"
          hint="Each dot is one priced run: when it finished and how long the agent took, on a log axis. Failures are rings. Click a dot to open its record."
          className="lg:col-span-2"
          action={firstPage?.nextCursor ? <span className="font-mono text-[11px] text-faint">latest {points.length}</span> : null}
        >
          {records.isLoading ? (
            skeleton
          ) : points.length === 0 ? (
            empty("No recorded durations")
          ) : (
            <RunScatter
              ariaLabel="Duration of each run over time"
              points={points}
              from={new Date(bounds.from).getTime()}
              to={new Date(bounds.to).getTime()}
              references={durationRefs}
              format={duration}
              axisFormat={durationAxis}
              dayLabel={scatterDay}
            />
          )}
        </Widget>

        <Widget title="Tokens" hint="Input, output and embedding tokens per UTC day. Each trend fits its own range, so compare shapes here and totals in the column." href={`${base}/usage?range=${range}&metric=tokens`}>
          {usageFlat.isLoading ? (
            skeleton
          ) : tokenRows.every((r) => r.value === 0) ? (
            empty("No tokens metered")
          ) : (
            <div className="flex h-full flex-col justify-center gap-4">
              {tokenRows.map((r) => (
                <div key={r.key}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-0.5 w-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
                      {r.label}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">{fmtTokens(r.value)}</span>
                  </div>
                  <Sparkline values={r.spark} color={r.color} className="mt-1 h-9!" />
                </div>
              ))}
            </div>
          )}
        </Widget>

        <Widget title="Spend by agent" hint="Billed amount per UTC day: provider cost times your markup, top five agents. Hover an agent to bring it forward." href={`${base}/usage?range=${range}`} className="lg:col-span-2">
          {usage.isLoading ? (
            skeleton
          ) : spend.legend.length === 0 ? (
            empty("No billed usage in this window")
          ) : (
            <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_290px]">
              <TimeChart
                ariaLabel="Billed spend per day, stacked by agent"
                height={208}
                rows={spend.data}
                series={spend.series}
                stacked
                legend={false}
                highlight={spendFocus}
                format={(v) => usd(v)}
                axisFormat={usdAxis}
              />
              <BreakdownRows rows={spendRows} format={(v) => usd(v)} active={spendFocus} onActive={setSpendFocus} />
            </div>
          )}
        </Widget>

        <Widget title="Jobs by status" hint="Jobs created in the window." href={`${base}/runs?range=${range}`}>
          {summary.isLoading ? (
            <Skeleton className="h-24" />
          ) : slices.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-faint">No jobs in this window</p>
          ) : (
            <SegmentBreakdown rows={slices} hrefFor={(k) => `${base}/runs?status=${k}&range=${range}`} />
          )}
        </Widget>

        <Widget title="Deliveries by status" hint="Callback deliveries created in the window, by where they ended up." href={`${base}/callbacks`}>
          {summary.isLoading ? (
            <Skeleton className="h-24" />
          ) : deliveryRows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-faint">No deliveries in this window</p>
          ) : (
            <SegmentBreakdown rows={deliveryRows} />
          )}
        </Widget>

        <ErrorFeed base={base} projectId={projectId} />
      </div>
    </div>
  );
}

/** The parts as fine ticks, then the numbers behind them. Hovering a row picks out its part. */
function SegmentBreakdown({
  rows,
  hrefFor,
}: {
  rows: Array<{ key: string; label: string; value: number; color: string }>;
  hrefFor?: (key: string) => string;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <SegmentTicks rows={rows} active={focus} />
      <BreakdownRows rows={rows.map((r) => ({ ...r, href: hrefFor?.(r.key) }))} format={(v) => compactNumber(v)} active={focus} onActive={setFocus} />
    </div>
  );
}

export default function ObservePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ObserveDashboard />
    </Suspense>
  );
}
