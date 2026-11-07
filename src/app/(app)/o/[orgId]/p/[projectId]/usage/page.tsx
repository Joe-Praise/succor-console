"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { DownloadIcon, ReceiptIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCurrentUsage, useUsage } from "@/features/projects/hooks";
import { useUsageRecords } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { dayKeys, priorByDay, totalsOf, type GroupKey, type Metric } from "@/features/usage/series";
import { BudgetBurn } from "@/features/usage/budget-burn";
import { MetricExplorer, type MetricDef } from "@/features/usage/metric-explorer";
import { FAILED_RUN_STATUSES } from "@/lib/status";
import { useUrlFilters } from "@/lib/url-filters";
import { rangeBounds, previousBounds, isRangeKey, type RangeKey } from "@/lib/time-range";
import { toCsv, download } from "@/lib/csv";
import { usd, usdAxis, usdPrecise, compactNumber, percent, delta, dateTime, tokens as fmtTokens, shortId } from "@/lib/format";
import type { UsageRecord } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ops/data-table";
import { CursorPager, Section } from "@/components/ops/primitives";
import { RollingNumber } from "@/components/charts/rolling-number";
import { Sparkline } from "@/components/charts/sparkline";
import { TimeRangeTabs, FilterBar } from "@/components/ops/filters";
import { QueryError } from "@/components/query-error";

const URL_KEYS = ["range", "by", "metric"] as const;
const RANGES: RangeKey[] = ["7d", "30d", "90d"];

const dayLabel = (p: string) =>
  new Date(p).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const METRICS: MetricDef[] = [
  {
    key: "billedUsd",
    label: "Billed",
    format: (v) => usd(v),
    axisFormat: usdAxis,
    goodWhen: "neutral",
    definition: "What you're charged: each record's provider cost × the markup snapshotted on that record.",
  },
  {
    key: "costUsd",
    label: "Provider cost",
    format: (v) => usd(v),
    axisFormat: usdAxis,
    goodWhen: "neutral",
    definition: "Recorded model + embedding cost at the pricing version on each record. Excludes tool, infrastructure and delivery costs.",
  },
  {
    key: "runs",
    label: "Runs",
    format: (v) => compactNumber(v),
    goodWhen: "neutral",
    integer: true,
    definition: "Metered runs (one priced record each; an approval-gated run can have two).",
  },
  {
    key: "tokens",
    label: "Tokens",
    format: (v) => fmtTokens(v),
    goodWhen: "neutral",
    integer: true,
    definition: "Input, output and embedding tokens, added together.",
  },
];

const isMetric = (v: string | null | undefined): v is Metric => METRICS.some((m) => m.key === v);

/** A rate worked out per day: a number with the trend behind it. */
function RateTile({
  label,
  value,
  sub,
  values,
  color,
  definition,
}: {
  label: string;
  value: string;
  sub: string;
  values: Array<number | null>;
  color: string;
  definition: string;
}) {
  return (
    <div className="tile flex min-w-0 flex-col p-4" title={definition}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl leading-7 font-semibold tracking-tight text-foreground">
        <RollingNumber value={value} />
      </p>
      <p className="truncate text-[11px] text-faint">{sub}</p>
      <div className="mt-4 min-h-20 flex-1">
        <Sparkline values={values} color={color} className="h-full!" />
      </div>
    </div>
  );
}

function UsageExplorer() {
  const { orgId, projectId } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const { nameOf } = useAgentNames(projectId);
  const range: RangeKey = isRangeKey(values.range) && RANGES.includes(values.range) ? values.range : "30d";
  const group: GroupKey = values.by === "model" ? "model" : "agentType";
  const metric: Metric = isMetric(values.metric) ? values.metric : "billedUsd";
  const [now, setNow] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);
  const prev = previousBounds(bounds);
  const base = `/o/${orgId}/p/${projectId}`;

  const usage = useUsage(projectId, { granularity: "day", groupBy: group === "model" ? "model" : "agent", from: bounds.from, to: bounds.to });
  const prevUsage = useUsage(projectId, { granularity: "day", groupBy: "none", from: prev.from, to: prev.to });
  const current = useCurrentUsage(projectId);
  const records = useUsageRecords(projectId, { from: bounds.from, to: bounds.to, limit: 50 });

  const buckets = useMemo(() => usage.data?.buckets ?? [], [usage.data]);
  const t = totalsOf(buckets);
  const p = totalsOf(prevUsage.data?.buckets ?? []);
  const hasPrev = !!prevUsage.data && p.runs > 0;
  const d = (cur: number, before: number) => (hasPrev ? delta(cur, before) : null);
  const days = useMemo(() => dayKeys(bounds.from, bounds.to), [bounds.from, bounds.to]);
  const priorDays = useMemo(() => dayKeys(prev.from, prev.to), [prev.from, prev.to]);
  const perDay = useMemo(() => {
    const runs = priorByDay(buckets, "runs", days);
    const billed = priorByDay(buckets, "billedUsd", days);
    const failed = days.map((day) =>
      buckets
        .filter((b) => b.period.slice(0, 10) === day)
        .reduce((n, b) => n + Object.entries(b.statuses ?? {}).reduce((m, [s, v]) => (FAILED_RUN_STATUSES.has(s) ? m + v : m), 0), 0),
    );
    return {
      billedPerRun: days.map((_, i) => (runs[i] ? billed[i] / runs[i] : null)),
      failureRate: days.map((_, i) => (runs[i] ? failed[i] / runs[i] : null)),
    };
  }, [buckets, days]);
  const recRows = records.data?.pages.flatMap((pg) => pg.records) ?? [];

  const labelOf = (k: string) => (group === "agentType" ? nameOf(k) : k);
  const hrefFor = (k: string) => (group === "agentType" ? `${base}/runs?agent=${k}&range=${range}` : `${base}/logs?model=${k}`);

  function exportCsv() {
    download(
      `${projectId}-usage-${range}.csv`,
      toCsv(
        ["period", group, "runs", "inputTokens", "outputTokens", "embeddingTokens", "costUsd", "billedUsd"],
        buckets.map((b) => [
          b.period,
          (group === "agentType" ? b.agentType : b.model) ?? "",
          b.runs,
          b.inputTokens,
          b.outputTokens,
          b.embeddingTokens,
          b.costUsd,
          b.billedUsd,
        ]),
      ),
    );
  }

  const loading = usage.isLoading;
  const budget = current.data?.monthlyBudgetUsd ?? null;

  return (
    <div className="settle-in space-y-4">
      <PageHeader
        size="compact"
        title="Usage & economics"
        description="What this project has cost, by agent or model — every number traceable to the priced records behind it."
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={buckets.length === 0}>
            <DownloadIcon />
            Export CSV
          </Button>
        }
      />

      <FilterBar
        onRefresh={() => {
          setNow(Date.now());
          void usage.refetch();
          void prevUsage.refetch();
        }}
        refreshing={usage.isFetching}
      >
        <TimeRangeTabs value={range} presets={RANGES} onChange={(v) => set({ range: v === "30d" ? null : v })} />
        <Tabs value={group} onValueChange={(v) => set({ by: v === "model" ? "model" : null })}>
          <TabsList>
            <TabsTrigger value="agentType">By agent</TabsTrigger>
            <TabsTrigger value="model">By model</TabsTrigger>
          </TabsList>
        </Tabs>
      </FilterBar>

      {usage.isError ? (
        <QueryError message="Couldn't load usage." onRetry={() => void usage.refetch()} />
      ) : loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className={cn("transition-opacity duration-200", usage.isPlaceholderData && "opacity-60")}>
          <MetricExplorer
            metrics={METRICS}
            active={metric}
            onActive={(m) => set({ metric: m === "billedUsd" ? null : m })}
            buckets={buckets}
            priorBuckets={hasPrev ? (prevUsage.data?.buckets ?? []) : []}
            days={days}
            priorDays={priorDays}
            group={group}
            labelOf={labelOf}
            hrefFor={hrefFor}
            periodLabel={dayLabel}
            totals={{ billedUsd: t.billedUsd, costUsd: t.costUsd, runs: t.runs, tokens: t.tokens }}
            changes={{ billedUsd: d(t.billedUsd, p.billedUsd), costUsd: d(t.costUsd, p.costUsd), runs: d(t.runs, p.runs), tokens: d(t.tokens, p.tokens) }}
          />
        </div>
      )}
      {!hasPrev && !prevUsage.isLoading && !loading ? (
        <p className="text-xs text-faint">No usage in the previous {range}, so there&apos;s nothing to compare against.</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <BudgetBurn projectId={projectId} now={now} budget={budget} />
        <RateTile
          label="Billed per run"
          value={t.runs ? usdPrecise(t.billedUsd / t.runs) : "—"}
          sub={`per UTC day, last ${range}`}
          values={perDay.billedPerRun}
          color="var(--chart-2)"
          definition="Billed amount divided by priced runs, each day."
        />
        <RateTile
          label="Failure rate"
          value={t.runs ? percent(t.failed / t.runs) : "—"}
          sub={`per UTC day, last ${range}`}
          values={perDay.failureRate}
          color="var(--error)"
          definition="Runs that ended in error, validation failure or rate limiting, out of all priced runs."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title="Priced records"
          description={`Every charge in the last ${range}. Open one to see how it was priced and which run produced it.`}
          actions={
            <Link href={`${base}/logs`} className="text-xs text-brand hover:underline">
              Open in Logs →
            </Link>
          }
        >
          <DataTable<UsageRecord>
            rows={recRows}
            getRowKey={(r) => r.id}
            getRowHref={(r) => `${base}/logs/${r.id}`}
            getRowLabel={(r) => `Open usage record for ${nameOf(r.agentType)}`}
            loading={records.isLoading}
            error={records.isError ? { message: "Couldn't load records.", onRetry: () => void records.refetch() } : null}
            empty={<EmptyState icon={ReceiptIcon} title="No charges in this window" description="Priced records appear as runs reach their final state." />}
            columns={[
              { id: "ts", header: "Recorded", cell: (r) => <span className="text-muted-foreground">{dateTime(r.ts)}</span> },
              { id: "agent", header: "Agent", cell: (r) => nameOf(r.agentType) },
              { id: "status", header: "Outcome", cell: (r) => <AnyStatusBadge value={r.status} /> },
              { id: "cost", header: "Provider cost", align: "right", cell: (r) => <span className="text-muted-foreground">{usdPrecise(r.estimatedCostUsd)}</span> },
              { id: "billed", header: "Billed", align: "right", cell: (r) => usdPrecise(r.billedUsd) },
              { id: "run", header: "Run", align: "right", cell: (r) => (r.jobId ? <span className="font-mono text-[11px] text-faint">{shortId(r.jobId)}</span> : "—") },
            ]}
            footer={
              recRows.length ? (
                <CursorPager
                  hasMore={!!records.hasNextPage}
                  loading={records.isFetchingNextPage}
                  onLoadMore={() => void records.fetchNextPage()}
                  count={recRows.length}
                  noun="records"
                />
              ) : null
            }
          />
        </Section>

        <div className="space-y-4">
          <div className="tile p-4">
            <p className="text-sm font-semibold text-foreground">How the budget works</p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>• Scope: this project, the current UTC calendar month, billed amounts.</li>
              <li>• At the cap, new agent calls get <span className="font-mono">402</span> before anything is queued — no work, no charge.</li>
              <li>• At 80%, the platform team is alerted once per month.</li>
              <li>• Caps are set by your platform admin.</li>
            </ul>
          </div>
          <div className="tile p-4">
            <p className="text-sm font-semibold text-foreground">What&apos;s metered</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground">Included:</span> model input/output tokens and embedding tokens, priced at the
                recorded rate card.
              </li>
              <li>
                <span className="text-foreground">Not included:</span> tool calls, infrastructure, callback delivery.
              </li>
              <li>
                <span className="text-foreground">Retries:</span> a run is billed once, at its final state — retries inside it
                aren&apos;t billed again.
              </li>
              <li>
                <span className="text-foreground">Failures:</span> a failed run is billed for the tokens it actually used.
              </li>
              <li>
                <span className="text-foreground">Duplicates:</span> a replayed requestId starts nothing and costs nothing.
              </li>
              <li>
                <span className="text-foreground">Invoices:</span> monthly per project, itemized by agent, built from these same
                records.{" "}
                <Link href={`${base}/invoices`} className="text-brand hover:underline">
                  Invoices →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <UsageExplorer />
    </Suspense>
  );
}
