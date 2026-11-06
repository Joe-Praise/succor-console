"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useRuns, useOpsSummary } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { runColumns } from "@/features/executions/run-columns";
import { useUrlFilters } from "@/lib/url-filters";
import { isRangeKey, rangeBounds, type RangeKey } from "@/lib/time-range";
import { shortId } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ops/data-table";
import { CursorPager, ToneDot } from "@/components/ops/primitives";
import { FilterBar, SelectFilter, TimeRangeTabs, SearchFilter } from "@/components/ops/filters";

const FILTER_KEYS = ["status", "agent", "range", "request", "workflow"] as const;

/** Status options map to the API's csv filter; "live" is the worker's own set. */
const STATUS_OPTIONS = [
  { value: "queued,running", label: "Live (queued + running)" },
  { value: "pending_approval", label: "Awaiting approval" },
  { value: "succeeded", label: "Succeeded" },
  { value: "dead", label: "Dead-lettered" },
  { value: "rejected", label: "Rejected" },
  { value: "dead,rejected", label: "All failures" },
];

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function LiveStrip({ projectId }: { projectId: string }) {
  const summary = useOpsSummary(projectId);
  if (summary.isLoading) return <Skeleton className="h-5 w-72" />;
  const live = summary.data?.live ?? {};
  const parts: Array<[string, number, "info" | "neutral" | "warning"]> = [
    ["running", live["running"] ?? 0, "info"],
    ["queued", live["queued"] ?? 0, "neutral"],
    ["awaiting approval", live["pending_approval"] ?? 0, "warning"],
  ];
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="text-faint">Right now</span>
      {parts.map(([label, n, tone]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <ToneDot tone={n > 0 ? tone : "faint"} className={n > 0 && tone === "info" ? "animate-pulse" : undefined} />
          <span className="font-medium text-foreground tabular-nums">{n}</span> {label}
        </span>
      ))}
    </p>
  );
}

function RunsExplorer() {
  const { orgId, projectId } = useProjectScope();
  const router = useRouter();
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const { nameOf, entries } = useAgentNames(projectId);
  const range: RangeKey = isRangeKey(values.range) ? values.range : "7d";
  // "now" is captured once (and on refresh) so the range — and the query key — is stable.
  const [now, setNow] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);

  const runs = useRuns(projectId, {
    status: values.status || undefined,
    agentType: values.agent || undefined,
    requestId: values.request || undefined,
    workflowId: values.workflow || undefined,
    from: bounds.from,
    limit: 50,
  });
  const rows = runs.data?.pages.flatMap((p) => p.jobs) ?? [];
  const base = `/o/${orgId}/p/${projectId}`;

  const columns = runColumns(nameOf);

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
        title="Runs"
        description="Every agent call is a durable job. Open one to see its timeline, output, cost and delivery."
      />

      <LiveStrip projectId={projectId} />

      <FilterBar
        active={active - (values.range ? 1 : 0)}
        onClear={reset}
        onRefresh={() => {
          setNow(Date.now());
          void runs.refetch();
        }}
        refreshing={runs.isFetching && !runs.isFetchingNextPage}
      >
        <TimeRangeTabs value={range} onChange={(v) => set({ range: v === "7d" ? null : v })} />
        <SelectFilter
          label="Status"
          value={values.status}
          options={STATUS_OPTIONS}
          onChange={(v) => set({ status: v })}
        />
        <SelectFilter
          label="Agent"
          value={values.agent}
          options={entries.map((e) => ({ value: e.agentType, label: e.name }))}
          onChange={(v) => set({ agent: v })}
        />
        <SearchFilter
          value={values.request}
          placeholder="Job ID or request ID"
          onCommit={(v) => {
            if (OBJECT_ID.test(v)) {
              router.push(`${base}/runs/${v}`);
              return;
            }
            set({ request: v });
          }}
        />
      </FilterBar>

      {values.workflow ? (
        <p className="text-xs text-muted-foreground">
          Showing runs spawned by workflow <span className="font-mono text-foreground">{shortId(values.workflow)}</span> ·{" "}
          <button type="button" className="text-brand hover:underline" onClick={() => set({ workflow: null })}>
            show all
          </button>
        </p>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `${base}/runs/${r.id}`}
        getRowLabel={(r) => `Open run ${r.id} (${nameOf(r.agentType)})`}
        loading={runs.isLoading}
        error={runs.isError ? { message: "Couldn't load runs.", onRetry: () => void runs.refetch() } : null}
        empty={
          <EmptyState
            icon={ActivityIcon}
            title={active > 0 ? "No runs match these filters" : "No runs in this period"}
            description={
              active > 0
                ? "Widen the time range or clear a filter."
                : "Call an agent from your backend or the Playground and its run shows up here instantly."
            }
          />
        }
        footer={
          rows.length > 0 ? (
            <CursorPager
              hasMore={!!runs.hasNextPage}
              loading={runs.isFetchingNextPage}
              onLoadMore={() => void runs.fetchNextPage()}
              count={rows.length}
              noun="runs"
            />
          ) : null
        }
      />
    </div>
  );
}

export default function RunsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RunsExplorer />
    </Suspense>
  );
}
