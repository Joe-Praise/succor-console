"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { DownloadIcon, WalletIcon, ReceiptIcon, CoinsIcon, ActivityIcon, SigmaIcon, PercentIcon, CalculatorIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCurrentUsage, useUsage } from "@/features/projects/hooks";
import { useUsageRecords } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { stackBy, totalsOf, type GroupKey, type Metric } from "@/features/usage/series";
import { useUrlFilters } from "@/lib/url-filters";
import { rangeBounds, previousBounds, isRangeKey, type RangeKey } from "@/lib/time-range";
import { toCsv, download } from "@/lib/csv";
import { usd, usdPrecise, compactNumber, percent, delta, dateTime, tokens as fmtTokens, shortId } from "@/lib/format";
import type { UsageRecord } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ops/data-table";
import { CursorPager, KpiCard, Section } from "@/components/ops/primitives";
import { StackedBars, LegendTable } from "@/components/ops/charts";
import { TimeRangeTabs, FilterBar } from "@/components/ops/filters";
import { QueryError } from "@/components/query-error";

const URL_KEYS = ["range", "by"] as const;
const RANGES: RangeKey[] = ["7d", "30d", "90d"];

const dayLabel = (p: string) =>
  new Date(p).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function ChartCard({
  title,
  metric,
  formatter,
  buckets,
  group,
  labelOf,
  hrefFor,
}: {
  title: string;
  metric: Metric;
  formatter: (v: number) => string;
  buckets: Parameters<typeof stackBy>[0];
  group: GroupKey;
  labelOf: (k: string) => string;
  hrefFor: (k: string) => string | undefined;
}) {
  const s = stackBy(buckets, group, metric, 5, labelOf, dayLabel);
  return (
    <div className="flex flex-col tile p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {s.data.length === 0 ? (
        <p className="py-16 text-center text-sm text-faint">No usage in this window.</p>
      ) : (
        <>
          <StackedBars data={s.data} xKey="label" series={s.series} height={190} valueFormatter={formatter} className="mt-3" />
          <div className="mt-4 border-t border-border pt-3">
            <LegendTable
              rows={s.legend.map((l) => ({ ...l, href: l.key === "__others" ? undefined : hrefFor(l.key) }))}
              formatter={formatter}
            />
          </div>
        </>
      )}
    </div>
  );
}

function UsageExplorer() {
  const { orgId, projectId } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const { nameOf } = useAgentNames(projectId);
  const range: RangeKey = isRangeKey(values.range) && RANGES.includes(values.range) ? values.range : "30d";
  const group: GroupKey = values.by === "model" ? "model" : "agentType";
  const [now, setNow] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);
  const prev = previousBounds(bounds);
  const base = `/o/${orgId}/p/${projectId}`;

  const usage = useUsage(projectId, { granularity: "day", groupBy: group === "model" ? "model" : "agent", from: bounds.from, to: bounds.to });
  const prevUsage = useUsage(projectId, { granularity: "day", groupBy: "none", from: prev.from, to: prev.to });
  const current = useCurrentUsage(projectId);
  const records = useUsageRecords(projectId, { from: bounds.from, to: bounds.to, limit: 50 });

  const buckets = usage.data?.buckets ?? [];
  const t = totalsOf(buckets);
  const p = totalsOf(prevUsage.data?.buckets ?? []);
  const hasPrev = !!prevUsage.data && p.runs > 0;
  const d = (cur: number, before: number) => (hasPrev ? delta(cur, before) : null);
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
  const budgetPct = budget && current.data ? current.data.billedUsd / budget : null;

  return (
    <div className="space-y-6">
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="Provider cost"
            icon={CoinsIcon}
            value={usd(t.costUsd)}
            delta={d(t.costUsd, p.costUsd)}
            goodWhen="down"
            sub={`last ${range}`}
            loading={loading}
            definition="Recorded model + embedding cost at the pricing version on each record. Excludes tool, infrastructure and delivery costs."
          />
          <KpiCard
            label="Billed"
            icon={ReceiptIcon}
            value={usd(t.billedUsd)}
            delta={d(t.billedUsd, p.billedUsd)}
            goodWhen="down"
            sub="cost × markup"
            loading={loading}
            definition="What you're charged: each record's provider cost × the markup snapshotted on that record."
          />
          <KpiCard
            label="Runs"
            icon={ActivityIcon}
            value={compactNumber(t.runs)}
            delta={d(t.runs, p.runs)}
            sub="priced runs"
            loading={loading}
            definition="Metered runs (one priced record each; an approval-gated run can have two)."
          />
          <KpiCard
            label="Tokens"
            icon={SigmaIcon}
            value={fmtTokens(t.tokens)}
            delta={d(t.tokens, p.tokens)}
            sub="in + out + embedding"
            loading={loading}
          />
          <KpiCard
            label="Billed per run"
            icon={CalculatorIcon}
            value={t.runs ? usdPrecise(t.billedUsd / t.runs) : "—"}
            delta={hasPrev && t.runs && p.runs ? delta(t.billedUsd / t.runs, p.billedUsd / p.runs) : null}
            goodWhen="down"
            loading={loading}
            unavailable={!loading && t.runs === 0 ? "No runs in this window" : null}
          />
          <KpiCard
            label="Failure rate"
            icon={PercentIcon}
            value={t.runs ? percent(t.failed / t.runs) : "—"}
            delta={hasPrev && t.runs && p.runs ? delta(t.failed / t.runs, p.failed / p.runs) : null}
            goodWhen="down"
            loading={loading}
            unavailable={!loading && t.runs === 0 ? "No runs in this window" : null}
            definition="Runs that ended in error, validation failure or rate limiting, out of all priced runs."
          />
          <KpiCard
            label="Budget used"
            icon={WalletIcon}
            value={budgetPct === null ? "—" : percent(budgetPct, 0)}
            sub={budget ? `${usd(current.data?.billedUsd)} of ${usd(budget)} · this month` : "no cap set"}
            loading={current.isLoading}
            unavailable={!current.isLoading && !budget ? "No monthly cap set" : null}
            tone={budgetPct !== null && budgetPct >= 0.8 ? "warning" : undefined}
            definition="This UTC month's billed usage against the project's monthly cap. At the cap, new calls are refused with 402 before anything is queued."
          />
        </div>
      )}
      {!hasPrev && !prevUsage.isLoading && !loading ? (
        <p className="-mt-3 text-xs text-faint">No usage in the previous {range}, so there&apos;s nothing to compare against.</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Spend (billed)" metric="billedUsd" formatter={(v) => usd(v)} buckets={buckets} group={group} labelOf={labelOf} hrefFor={hrefFor} />
          <ChartCard title="Runs" metric="runs" formatter={(v) => compactNumber(v)} buckets={buckets} group={group} labelOf={labelOf} hrefFor={hrefFor} />
          <ChartCard title="Tokens" metric="tokens" formatter={(v) => fmtTokens(v)} buckets={buckets} group={group} labelOf={labelOf} hrefFor={hrefFor} />
        </div>
      )}

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
            <p className="text-sm font-semibold text-foreground">Monthly budget</p>
            <div className="mt-3">
              {current.isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : current.data ? (
                <BudgetMeter spent={current.data.billedUsd} budget={current.data.monthlyBudgetUsd} />
              ) : null}
            </div>
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
                <span className="text-foreground">Duplicates:</span> a replayed requestId starts nothing, so there's no new charge.
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
