"use client";

import { Suspense } from "react";
import { FingerprintIcon, ShieldCheckIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useAuditEvents } from "@/features/governance/hooks";
import { AUDIT_ACTION_COPY } from "@/features/governance/audit-copy";
import { useUrlFilters } from "@/lib/url-filters";
import { dateTime, shortId } from "@/lib/format";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, AUDIT_TARGET_TYPES, type AuditEvent } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ops/data-table";
import { CursorPager } from "@/components/ops/primitives";
import { FilterBar, SelectFilter } from "@/components/ops/filters";


const FILTER_KEYS = ["action", "outcome", "target"] as const;

function details(e: AuditEvent): string {
  const bits: string[] = [];
  if (e.category) bits.push(e.category);
  if (e.counts) for (const [k, v] of Object.entries(e.counts)) bits.push(`${k}: ${v}`);
  if (e.noteLength != null) bits.push(`note · ${e.noteLength} chars`);
  return bits.join(" · ");
}

function AuditExplorer() {
  const { orgId, projectId } = useProjectScope();
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const audit = useAuditEvents(projectId, {
    action: values.action || undefined,
    outcome: values.outcome || undefined,
    targetType: values.target || undefined,
  });
  const rows = (audit.data?.pages.flatMap((p) => p.events) ?? []);
  const base = `/o/${orgId}/p/${projectId}`;

  const columns: Column<AuditEvent>[] = [
    { id: "ts", header: "When", cell: (e) => <span className="text-muted-foreground">{e.unreadable ? "—" : dateTime(e.ts)}</span> },
    {
      id: "action",
      header: "Action",
      cell: (e) =>
        e.unreadable ? (
          <span className="text-warning">Unreadable row — kept and flagged for the operator</span>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-foreground">{AUDIT_ACTION_COPY[e.action ?? ""] ?? e.action}</p>
            {e.agentType ? <p className="font-mono text-[11px] text-faint">{e.agentType}</p> : null}
          </div>
        ),
    },
    { id: "outcome", header: "Outcome", cell: (e) => (e.unreadable ? null : <AnyStatusBadge value={e.outcome} />) },
    { id: "actor", header: "Actor", cell: (e) => <span className="block max-w-44 truncate font-mono text-[11px] text-faint">{e.actor}</span> },
    {
      id: "target",
      header: "Target",
      cell: (e) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {e.targetType} {shortId(e.targetId)}
        </span>
      ),
    },
    { id: "details", header: "Details", cell: (e) => <span className="text-xs text-muted-foreground">{details(e) || "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
        title="Audit"
        description="Every human decision and privileged operation on this project, signed the moment it's written."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="tile p-4">
          <FingerprintIcon className="size-4 text-brand" />
          <p className="mt-2 text-sm font-medium text-foreground">Append-only, signed rows</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Each row carries an HMAC over its contents. Rows are only ever inserted — no edit or delete path exists.
          </p>
        </div>
        <div className="tile p-4">
          <ShieldCheckIcon className="size-4 text-brand" />
          <p className="mt-2 text-sm font-medium text-foreground">Deletion shows up</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sealed checkpoints count and digest closed time ranges, so a missing row surfaces in the scheduled integrity
            sweep.
          </p>
        </div>
        <div className="tile p-4">
          <p className="text-sm font-medium text-foreground">What this view is — and isn&apos;t</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            This is the data. Signatures are verified server-side by the operator, never in your browser, and prose
            (like reviewer notes) is never stored here — only its length.
          </p>
        </div>
      </div>

      <FilterBar active={active} onClear={reset}>
        <SelectFilter
          label="Action"
          value={values.action}
          options={AUDIT_ACTIONS.map((a) => ({ value: a, label: AUDIT_ACTION_COPY[a] ?? a }))}
          onChange={(v) => set({ action: v })}
        />
        <SelectFilter
          label="Outcome"
          value={values.outcome}
          options={AUDIT_OUTCOMES.map((o) => ({ value: o, label: o }))}
          onChange={(v) => set({ outcome: v })}
        />
        <SelectFilter
          label="Target"
          value={values.target}
          options={AUDIT_TARGET_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(v) => set({ target: v })}
        />
      </FilterBar>

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(e) => e.id}
        getRowHref={(e) => (e.unreadable ? null : `${base}/audit/${e.id}`)}
        getRowLabel={(e) => `Open audit event ${e.id}`}
        loading={audit.isLoading}
        error={audit.isError ? { message: "Couldn't load the audit ledger.", onRetry: () => void audit.refetch() } : null}
        empty={
          <EmptyState
            icon={FingerprintIcon}
            title={active ? "No events match these filters" : "No audit events yet"}
            description="Approvals, rejections, retention erasures and operator repairs are recorded here as they happen."
          />
        }
        footer={
          rows.length ? (
            <CursorPager
              hasMore={!!audit.hasNextPage}
              loading={audit.isFetchingNextPage}
              onLoadMore={() => void audit.fetchNextPage()}
              count={rows.length}
              noun="events"
            />
          ) : null
        }
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <AuditExplorer />
    </Suspense>
  );
}
