"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks, useCurrentUsage, useUsage } from "@/features/projects/hooks";
import { useOpsSummary, useRuns } from "@/features/executions/hooks";
import { fillDaily, jobSlices, successRate, TONE_COLOR, undeliverable } from "@/features/executions/ops";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { stackBy } from "@/features/usage/series";
import { useUrlFilters } from "@/lib/url-filters";
import { isoDay, isRangeKey, previousBounds, rangeBounds, type RangeKey } from "@/lib/time-range";
import { toneOf } from "@/lib/status";
import { compactNumber, delta, duration, percent, relativeTime, shortId, tokens as fmtTokens, usd } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { HttpStatus, MethodMark, StatBand, ToneDot, Widget } from "@/components/ops/primitives";
import { LegendTable, StackedBars, StepLines } from "@/components/ops/charts";
import { FilterBar, TimeRangeTabs } from "@/components/ops/filters";

const URL_KEYS = ["range"] as const;
const SYNC = "observe";

const dayLabel = (p: string) => new Date(p).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

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
      className="lg:col-span-3"
      bodyClassName="p-0"
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
              <Link href={r.href} className="grid grid-cols-[84px_40px_minmax(0,110px)_minmax(0,170px)_minmax(0,1fr)] items-center gap-3 border-b border-hairline px-3 py-1.5 transition-colors last:border-0 hover:bg-raised">
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

  const s = summary.data;
  const p = prevSummary.data;
  const rate = s ? successRate(s.runs) : null;
  const prevRate = p ? successRate(p.runs) : null;
  const days = s ? fillDaily(s.daily, s.from, s.to) : [];
  const live = s ? (s.live["queued"] ?? 0) + (s.live["running"] ?? 0) : 0;
  const lost = s ? undeliverable(s.deliveries) : 0;
  const budget = usageNow.data?.monthlyBudgetUsd ?? null;
  const budgetPct = budget && usageNow.data ? usageNow.data.billedUsd / budget : null;
  const hasRuns = days.some((d) => d.succeeded + d.failed + d.other > 0);

  const rateSeries = days.map((d) => {
    const total = d.succeeded + d.failed + d.other;
    return { label: d.label, rate: total ? d.succeeded / total : null };
  });
  const durationSeries = days.map((d) => ({ label: d.label, avg: d.avgDurationMs }));
  const spend = useMemo(() => stackBy(usage.data?.buckets ?? [], "agentType", "billedUsd", 5, nameOf, dayLabel), [usage.data, nameOf]);
  const tokenSeries = useMemo(
    () =>
      (usageFlat.data?.buckets ?? [])
        .map((b) => ({ label: dayLabel(b.period), period: b.period, input: b.inputTokens, output: b.outputTokens, embedding: b.embeddingTokens }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    [usageFlat.data],
  );
  const slices = s ? jobSlices(s.jobs) : [];
  const deliveryRows = s
    ? Object.entries(s.deliveries.byStatus)
        .filter(([, n]) => n > 0)
        .map(([key, value]) => ({ key, label: key, value, color: TONE_COLOR[toneOf(key)] }))
    : [];
  const empty = (msg: string) => <p className="grid h-42 place-items-center text-[13px] text-faint">{msg}</p>;
  const skeleton = <Skeleton className="h-42" />;

  return (
    <div className="space-y-3">
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
            },
            {
              label: "Runs",
              value: s ? compactNumber(s.runs.total) : "—",
              sub: changeNote(s && p && p.runs.total ? delta(s.runs.total, p.runs.total) : null) ?? `last ${range}`,
              href: `${base}/runs?range=${range}`,
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
            },
            {
              label: "Budget used",
              value: budgetPct === null ? "—" : percent(budgetPct, 0),
              sub: budget ? `${usd(usageNow.data?.billedUsd)} of ${usd(budget)}` : "no cap set",
              tone: budgetPct !== null && budgetPct >= 0.8 ? "warning" : undefined,
              href: `${base}/usage`,
            },
          ]}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <ErrorFeed base={base} projectId={projectId} />

        <Widget title="Runs by outcome" hint="Priced runs per UTC day." href={`${base}/runs?range=${range}`}>
          {summary.isLoading ? (
            skeleton
          ) : !hasRuns ? (
            empty("No priced runs in this window")
          ) : (
            <StackedBars
              syncId={SYNC}
              height={168}
              data={days.map((d) => ({ ...d }))}
              xKey="label"
              series={[
                { key: "succeeded", label: "Succeeded", color: "var(--success)" },
                { key: "failed", label: "Failed", color: "var(--error)" },
                { key: "other", label: "Other", color: "var(--text-tertiary)" },
              ]}
              valueFormatter={(v) => compactNumber(v)}
            />
          )}
        </Widget>

        <Widget title="Success rate" hint="Succeeded runs out of all priced runs, per UTC day. Days with no runs are gaps.">
          {summary.isLoading ? (
            skeleton
          ) : !hasRuns ? (
            empty("Nothing to divide yet")
          ) : (
            <StepLines
              syncId={SYNC}
              height={168}
              data={rateSeries}
              xKey="label"
              domain={[0, 1]}
              series={[{ key: "rate", label: "Success rate", color: "var(--success)" }]}
              valueFormatter={(v) => percent(v, 0)}
            />
          )}
        </Widget>

        <Widget title="Average duration" hint="Agent execution time, averaged per UTC day. Excludes queue wait and delivery.">
          {summary.isLoading ? (
            skeleton
          ) : !hasRuns ? (
            empty("No recorded durations")
          ) : (
            <StepLines
              syncId={SYNC}
              height={168}
              data={durationSeries}
              xKey="label"
              series={[{ key: "avg", label: "Average", color: "var(--chart-2)" }]}
              valueFormatter={(v) => duration(v)}
            />
          )}
        </Widget>

        <Widget title="Spend by agent" hint="Billed amount per UTC day: provider cost times your markup, top five agents." href={`${base}/usage?range=${range}`} className="lg:col-span-2">
          {usage.isLoading ? (
            skeleton
          ) : spend.series.length === 0 ? (
            empty("No billed usage in this window")
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_230px]">
              <StackedBars height={168} data={spend.data} xKey="label" series={spend.series} valueFormatter={(v) => usd(v)} />
              <LegendTable rows={spend.legend} formatter={(v) => usd(v)} />
            </div>
          )}
        </Widget>

        <Widget title="Tokens" hint="Input, output and embedding tokens per UTC day." href={`${base}/usage?range=${range}`}>
          {usageFlat.isLoading ? (
            skeleton
          ) : tokenSeries.length === 0 ? (
            empty("No tokens metered")
          ) : (
            <StepLines
              height={168}
              data={tokenSeries}
              xKey="label"
              series={[
                { key: "input", label: "Input", color: "var(--chart-2)" },
                { key: "output", label: "Output", color: "var(--chart-3)" },
                { key: "embedding", label: "Embedding", color: "var(--chart-4)" },
              ]}
              valueFormatter={(v) => fmtTokens(v)}
            />
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

        <Widget title="Deliveries by status" hint="Callback deliveries created in the window, by where they ended up." href={`${base}/callbacks`} className="lg:col-span-2">
          {summary.isLoading ? (
            <Skeleton className="h-24" />
          ) : deliveryRows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-faint">No deliveries in this window</p>
          ) : (
            <SegmentBreakdown rows={deliveryRows} />
          )}
        </Widget>
      </div>
    </div>
  );
}

/** One proportional bar, then the numbers behind it. */
function SegmentBreakdown({
  rows,
  hrefFor,
}: {
  rows: Array<{ key: string; label: string; value: number; color: string }>;
  hrefFor?: (key: string) => string;
}) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-2 gap-px overflow-hidden rounded-[2px]" aria-hidden>
        {rows.map((r) => (
          <span key={r.key} style={{ width: `${(r.value / total) * 100}%`, background: r.color, minWidth: 2 }} />
        ))}
      </div>
      <LegendTable rows={rows.map((r) => ({ ...r, href: hrefFor?.(r.key) }))} formatter={(v) => compactNumber(v)} />
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
