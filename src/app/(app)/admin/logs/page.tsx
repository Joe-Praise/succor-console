"use client";

import { Suspense } from "react";
import { ScrollTextIcon } from "lucide-react";

import { useAdminLogs } from "@/features/admin/hooks";
import type { AdminLogRow } from "@/features/admin/admin-log";
import { useUrlFilters } from "@/lib/url-filters";
import { dateTime, usdPrecise, tokens, duration } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ops/data-table";
import { FilterBar, SelectFilter, SearchFilter } from "@/components/ops/filters";

const FILTER_KEYS = ["status", "project"] as const;

function AdminLogsInner() {
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const logs = useAdminLogs({ status: values.status || undefined, projectId: values.project || undefined });
  const rows = (logs.data?.logs ?? []) as AdminLogRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
        title="Run feed"
        description="Cross-tenant priced runs, newest first (refreshes every 10 seconds)."
      />
      <FilterBar active={active} onClear={reset} onRefresh={() => void logs.refetch()} refreshing={logs.isFetching}>
        <SelectFilter
          label="Outcome"
          value={values.status}
          options={["success", "error", "validation_failed", "rate_limited", "skipped"].map((s) => ({
            value: s,
            label: s.replace(/_/g, " "),
          }))}
          onChange={(v) => set({ status: v })}
        />
        <SearchFilter value={values.project} placeholder="Project ID" onCommit={(v) => set({ project: v })} />
      </FilterBar>
      <DataTable
        rows={rows}
        getRowKey={(l) => l._id ?? `${l.ts}-${l.projectId}`}
        getRowHref={(l) => (l._id ? `/admin/logs/${l._id}` : null)}
        getRowLabel={(l) => `Open log for ${l.projectId} ${l.agentType}`}
        loading={logs.isLoading}
        error={logs.isError ? { message: "Couldn't load the run feed.", onRetry: () => void logs.refetch() } : null}
        empty={<EmptyState icon={ScrollTextIcon} title="Nothing here" description="Runs appear as tenants call agents." />}
        columns={[
          { id: "ts", header: "Time", cell: (l) => <span className="text-muted-foreground">{dateTime(l.ts)}</span> },
          { id: "project", header: "Project", cell: (l) => <span className="font-mono text-xs">{l.projectId ?? "—"}</span> },
          { id: "agent", header: "Agent", cell: (l) => <span className="font-mono text-xs">{l.agentType ?? "—"}</span> },
          { id: "status", header: "Outcome", cell: (l) => <AnyStatusBadge value={l.status} /> },
          {
            id: "tokens",
            header: "Tokens",
            align: "right",
            cell: (l) => tokens((l.inputTokens ?? 0) + (l.outputTokens ?? 0) + (l.embeddingTokens ?? 0)),
          },
          { id: "dur", header: "Duration", align: "right", cell: (l) => <span className="text-muted-foreground">{duration(l.durationMs)}</span> },
          { id: "billed", header: "Billed", align: "right", cell: (l) => usdPrecise(l.billedUsd) },
        ]}
      />
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <AdminLogsInner />
    </Suspense>
  );
}
