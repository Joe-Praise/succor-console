"use client";

import { Suspense } from "react";
import Link from "next/link";
import { StampIcon, ArrowRightIcon, HistoryIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog } from "@/features/projects/hooks";
import { useApprovals } from "@/features/runtime/hooks";
import { useAuditEvents } from "@/features/governance/hooks";
import { useOrgCtx } from "@/features/orgs/org-context";
import { ApprovalCard } from "@/features/approvals/approval-card";
import { ORG_ROLE_RANK } from "@/lib/permissions";
import { useUrlFilters } from "@/lib/url-filters";
import { dateTime, shortId } from "@/lib/format";
import type { AuditEvent } from "@/types";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ops/data-table";
import { CursorPager } from "@/components/ops/primitives";
import { FilterBar } from "@/components/ops/filters";

const URL_KEYS = ["tab", "job", "decision"] as const;

const FLOW = [
  { n: "01", title: "Generate", body: "The agent runs and validates its output like any other job." },
  { n: "02", title: "Hold", body: "The tenant-affecting delivery is parked — nothing reaches your API." },
  { n: "03", title: "Decide", body: "An admin approves (optionally editing) or rejects with a note." },
  { n: "04", title: "Deliver or learn", body: "Approve → delivered durably. Reject → the note becomes a style rule." },
];

function PendingQueue({ focusJob }: { focusJob: string }) {
  const { orgId, projectId } = useProjectScope();
  const { role } = useOrgCtx();
  const approvals = useApprovals(projectId);
  const catalog = useCatalog(projectId);
  const canDecide = ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin;
  const base = `/o/${orgId}/p/${projectId}`;
  const gatedAgents = (catalog.data?.catalog ?? []).filter((e) => e.riskTier === "high");

  // A deep link (?job=) floats that approval to the top and highlights it.
  const rows = [...(approvals.data?.approvals ?? [])].sort(
    (a, b) => Number(b.jobId === focusJob) - Number(a.jobId === focusJob),
  );
  const focusMissing = !!focusJob && !!approvals.data && !rows.some((a) => a.jobId === focusJob);

  return (
    <div className="space-y-5">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map((s) => (
          <li key={s.n} className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="flex items-baseline gap-2 text-sm font-medium text-foreground">
              <span className="font-mono text-[11px] text-brand">{s.n}</span>
              {s.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      {gatedAgents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Gated agents:{" "}
          {gatedAgents.map((e, i) => (
            <span key={e.agentType}>
              <span className="font-mono text-foreground">{e.agentType}</span>
              {i < gatedAgents.length - 1 ? ", " : ""}
            </span>
          ))}
          . Workflows that include them wait here too.
        </p>
      ) : null}

      {focusMissing ? (
        <p className="rounded-lg bg-raised px-3 py-2 text-xs text-muted-foreground">
          Run <span className="font-mono">{shortId(focusJob)}</span> isn&apos;t waiting for a decision any more.{" "}
          <Link href={`${base}/runs/${focusJob}`} className="text-brand hover:underline">
            See what happened →
          </Link>
        </p>
      ) : null}

      {approvals.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : approvals.isError ? (
        <QueryError message="Couldn't load the approval queue." onRetry={() => void approvals.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={StampIcon}
          title="Nothing waiting on you"
          description="When a gated agent finishes, its held delivery shows up here for review."
          action={
            <Button variant="outline" size="sm" render={<Link href={`${base}/runs?status=pending_approval`} />}>
              See runs
              <ArrowRightIcon />
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {rows.map((a) => (
            <ApprovalCard
              key={a.jobId}
              approval={a}
              canDecide={canDecide}
              focused={a.jobId === focusJob}
              agentName={catalog.data?.catalog.find((e) => e.agentType === a.agentType)?.name ?? a.agentType}
              runHref={`${base}/runs/${a.jobId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DECISION_LABEL: Record<string, string> = {
  "approval.approve": "Approved",
  "approval.reject": "Rejected",
};

function DecisionHistory({ decision, onDecision }: { decision: string; onDecision: (v: string) => void }) {
  const { orgId, projectId } = useProjectScope();
  const catalog = useCatalog(projectId);
  const base = `/o/${orgId}/p/${projectId}`;
  const action = decision === "reject" ? "approval.reject" : "approval.approve";
  // The ledger filters on one exact action, so the two decisions are separate views
  // rather than a client-side merge of two cursors.
  const audit = useAuditEvents(projectId, { action, targetType: "agentJob" });
  const rows = audit.data?.pages.flatMap((p) => p.events) ?? [];
  const nameOf = (t: string | null | undefined) =>
    (t && catalog.data?.catalog.find((e) => e.agentType === t)?.name) || t || "—";

  return (
    <div className="space-y-4">
      <FilterBar onRefresh={() => void audit.refetch()} refreshing={audit.isFetching}>
        <Tabs value={decision === "reject" ? "reject" : "approve"} onValueChange={(v) => onDecision(v === "reject" ? "reject" : "")}>
          <TabsList>
            <TabsTrigger value="approve">Approved</TabsTrigger>
            <TabsTrigger value="reject">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </FilterBar>
      <p className="text-xs text-muted-foreground">
        From the signed audit ledger. Reviewer notes are never stored in the ledger — only their length. A{" "}
        <span className="font-mono">conflict</span> outcome means the run had already been decided.
      </p>
      <DataTable<AuditEvent>
        rows={rows}
        getRowKey={(e) => e.id}
        getRowHref={(e) => (e.targetId ? `${base}/runs/${e.targetId}` : null)}
        getRowLabel={(e) => `Open run ${e.targetId ?? ""}`}
        loading={audit.isLoading}
        error={audit.isError ? { message: "Couldn't load decision history.", onRetry: () => void audit.refetch() } : null}
        empty={
          <EmptyState
            icon={HistoryIcon}
            title={`No ${decision === "reject" ? "rejections" : "approvals"} yet`}
            description="Decisions appear here the moment they're recorded."
          />
        }
        columns={[
          { id: "ts", header: "When", cell: (e) => <span className="text-muted-foreground">{e.unreadable ? "—" : dateTime(e.ts)}</span> },
          {
            id: "decision",
            header: "Decision",
            cell: (e) => (e.unreadable ? <span className="text-warning">Unreadable row</span> : DECISION_LABEL[e.action ?? ""] ?? e.action),
          },
          { id: "outcome", header: "Outcome", cell: (e) => (e.unreadable ? null : <AnyStatusBadge value={e.outcome} />) },
          { id: "agent", header: "Agent", cell: (e) => nameOf(e.agentType) },
          { id: "actor", header: "Reviewer", cell: (e) => <span className="block max-w-44 truncate font-mono text-[11px] text-faint">{e.actor}</span> },
          { id: "note", header: "Note", cell: (e) => (e.noteLength ? `${e.noteLength} chars` : <span className="text-faint">—</span>) },
          {
            id: "ledger",
            header: "",
            align: "right",
            interactive: true,
            cell: (e) => (
              <Link href={`${base}/audit/${e.id}`} className="font-mono text-[11px] text-brand hover:underline">
                ledger {shortId(e.id)}
              </Link>
            ),
          },
        ]}
        footer={
          rows.length ? (
            <CursorPager
              hasMore={!!audit.hasNextPage}
              loading={audit.isFetchingNextPage}
              onLoadMore={() => void audit.fetchNextPage()}
              count={rows.length}
              noun="decisions"
            />
          ) : null
        }
      />
    </div>
  );
}

function ApprovalCenter() {
  const { projectId } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const approvals = useApprovals(projectId);
  const tab = values.tab === "history" ? "history" : "pending";
  const pending = approvals.data?.approvals.length;

  return (
    <div className="space-y-6">
      <PageHeader
        size="compact"
        eyebrow="Operate"
        title="Approvals"
        description="High-risk agents generate, then stop. Nothing reaches your API until an admin signs off."
      />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "history" ? "history" : null, job: null })}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending ? (
              <span className="ml-1.5 rounded-full bg-brand-muted px-1.5 text-[11px] tabular-nums text-brand">{pending}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "pending" ? (
        <PendingQueue focusJob={values.job} />
      ) : (
        <DecisionHistory decision={values.decision} onDecision={(v) => set({ decision: v || null })} />
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ApprovalCenter />
    </Suspense>
  );
}
