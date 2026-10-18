"use client";

import { Suspense } from "react";
import { DownloadIcon, ScrollTextIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useUsageRecords } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { useUrlFilters } from "@/lib/url-filters";
import { toCsv, download } from "@/lib/csv";
import { duration, dateTime, usdPrecise, tokens, shortId } from "@/lib/format";
import type { UsageRecord } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ops/data-table";
import { CursorPager } from "@/components/ops/primitives";
import { FilterBar, SelectFilter, SearchFilter } from "@/components/ops/filters";

const FILTER_KEYS = ["status", "agent", "model", "job", "from", "to"] as const;

const STATUS_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "error,rate_limited,validation_failed", label: "Any failure" },
  { value: "error", label: "Error" },
  { value: "validation_failed", label: "Validation failed" },
  { value: "rate_limited", label: "Rate limited" },
  { value: "skipped", label: "Skipped" },
];

function LogsExplorer() {
  const { orgId, projectId } = useProjectScope();
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const { nameOf, entries } = useAgentNames(projectId);
  const records = useUsageRecords(projectId, {
    status: values.status || undefined,
    agentType: values.agent || undefined,
    model: values.model || undefined,
    jobId: values.job || undefined,
    from: values.from || undefined,
    to: values.to || undefined,
    limit: 100,
  });
  const rows = records.data?.pages.flatMap((p) => p.records) ?? [];
  const base = `/o/${orgId}/p/${projectId}`;
  const models = [...new Set(rows.map((r) => r.model))].sort();

  function exportCsv() {
    const csv = toCsv(
      ["ts", "jobId", "agentType", "model", "status", "inputTokens", "outputTokens", "embeddingTokens", "estimatedCostUsd", "billedUsd", "markupMultiplier", "pricingVersion", "durationMs"],
      rows.map((r) => [
        r.ts.toISOString(), r.jobId ?? "", r.agentType, r.model, r.status, r.inputTokens ?? "", r.outputTokens ?? "",
        r.embeddingTokens ?? "", r.estimatedCostUsd ?? "", r.billedUsd ?? "", r.markupMultiplier ?? "", r.pricingVersion ?? "", r.durationMs ?? "",
      ]),
    );
    download(`${projectId}-usage-records.csv`, csv);
  }

  const columns: Column<UsageRecord>[] = [
    { id: "ts", header: "Recorded", cell: (r) => <span className="text-muted-foreground">{dateTime(r.ts)}</span> },
    {
      id: "agent",
      header: "Agent",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{nameOf(r.agentType)}</p>
          <p className="font-mono text-[11px] text-faint">{r.model}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Outcome",
      className: "max-w-64",
      cell: (r) => (
        <div className="min-w-0">
          <AnyStatusBadge value={r.status} />
          {r.errorMessage ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground" title={r.errorMessage}>
              {r.errorMessage}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "tokens",
      header: "Tokens",
      align: "right",
      cell: (r) => tokens((r.inputTokens ?? 0) + (r.outputTokens ?? 0) + (r.embeddingTokens ?? 0)),
    },
    { id: "cost", header: "Provider cost", align: "right", cell: (r) => <span className="text-muted-foreground">{usdPrecise(r.estimatedCostUsd)}</span> },
    { id: "billed", header: "Billed", align: "right", cell: (r) => usdPrecise(r.billedUsd) },
    { id: "dur", header: "Duration", align: "right", cell: (r) => <span className="text-muted-foreground">{duration(r.durationMs)}</span> },
    {
      id: "job",
      header: "Run",
      align: "right",
      cell: (r) => (r.jobId ? <span className="font-mono text-[11px] text-faint">{shortId(r.jobId)}</span> : <span className="text-faint">—</span>),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
        eyebrow="Operate"
        title="Logs"
        description="One priced, immutable record per metered run — the same rows your invoice is built from."
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <DownloadIcon />
            Export loaded rows
          </Button>
        }
      />

      <FilterBar active={active} onClear={reset} onRefresh={() => void records.refetch()} refreshing={records.isFetching && !records.isFetchingNextPage}>
        <SelectFilter label="Outcome" value={values.status} options={STATUS_OPTIONS} onChange={(v) => set({ status: v })} />
        <SelectFilter
          label="Agent"
          value={values.agent}
          options={entries.map((e) => ({ value: e.agentType, label: e.name }))}
          onChange={(v) => set({ agent: v })}
        />
        <SelectFilter
          label="Model"
          value={values.model}
          options={(values.model && !models.includes(values.model) ? [values.model, ...models] : models).map((m) => ({ value: m, label: m }))}
          onChange={(v) => set({ model: v })}
        />
        <SearchFilter value={values.job} placeholder="Filter by job ID" onCommit={(v) => set({ job: v })} />
      </FilterBar>

      {values.from || values.to ? (
        <p className="text-xs text-muted-foreground">
          Period {values.from ? dateTime(values.from) : "…"} → {values.to ? dateTime(values.to) : "now"} ·{" "}
          <button type="button" className="text-brand hover:underline" onClick={() => set({ from: null, to: null })}>
            all time
          </button>
        </p>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `${base}/logs/${r.id}`}
        getRowLabel={(r) => `Open usage record for ${nameOf(r.agentType)} at ${dateTime(r.ts)}`}
        loading={records.isLoading}
        error={records.isError ? { message: "Couldn't load usage records.", onRetry: () => void records.refetch() } : null}
        empty={
          <EmptyState
            icon={ScrollTextIcon}
            title={active > 0 ? "No records match these filters" : "No metered runs yet"}
            description={
              active > 0
                ? "Clear a filter to see more."
                : "A run is metered once, when it reaches its final state. Trigger an agent and its record appears here."
            }
          />
        }
        footer={
          rows.length ? (
            <CursorPager
              hasMore={!!records.hasNextPage}
              loading={records.isFetchingNextPage}
              onLoadMore={() => void records.fetchNextPage()}
              count={rows.length}
              noun="records"
            />
          ) : null
        }
      />
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LogsExplorer />
    </Suspense>
  );
}
