"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useWorkflow, LIVE_WORKFLOW_STATUSES } from "@/features/runtime/hooks";
import { useRuns } from "@/features/executions/hooks";
import { StepGraph } from "@/features/runtime/step-graph";
import { WORKFLOW_BY_TYPE } from "@/features/runtime/workflow-templates";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { cn } from "@/lib/utils";
import { dotClass, LIVE_JOB_STATUSES } from "@/lib/status";
import { dateTime, duration, shortId } from "@/lib/format";
import type { RunRow } from "@/types";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { Callout, Section } from "@/components/ops/primitives";

/**
 * Each job in the workflow as a bar from its createdAt to its last recorded state
 * change — real recorded bounds, labelled as such (not measured execution spans).
 */
function JobSpans({
  runs,
  base,
  nameOf,
  now,
}: {
  runs: RunRow[];
  base: string;
  nameOf: (t: string) => string;
  /** When the data was fetched — the end of a live job's bar (keeps render pure). */
  now: number;
}) {
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">No jobs spawned yet.</p>;
  const sorted = [...runs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const start = sorted[0].createdAt.getTime();
  const end = Math.max(
    ...sorted.map((r) => (LIVE_JOB_STATUSES.has(r.status) ? now : r.updatedAt.getTime())),
    start + 1,
  );
  const span = end - start;
  return (
    <div className="space-y-1">
      {sorted.map((r) => {
        const s = r.createdAt.getTime() - start;
        const e = (LIVE_JOB_STATUSES.has(r.status) ? now : r.updatedAt.getTime()) - start;
        return (
          <Link
            key={r.id}
            href={`${base}/runs/${r.id}`}
            className="grid grid-cols-[minmax(0,34%)_1fr_72px] items-center gap-3 rounded-md px-2 py-1 text-xs transition-colors hover:bg-raised"
          >
            <span className="truncate">
              <span className="text-foreground">{nameOf(r.agentType)}</span>{" "}
              <span className="font-mono text-faint">{shortId(r.id, 6)}</span>
            </span>
            <span className="relative h-3 rounded-full bg-border/50">
              <span
                className={cn("absolute inset-y-0 rounded-full opacity-80", dotClass(r.status))}
                style={{ left: `${(s / span) * 100}%`, width: `${Math.max(0.8, ((e - s) / span) * 100)}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-muted-foreground">{duration(Math.max(0, e - s))}</span>
          </Link>
        );
      })}
      <p className="pt-1 text-[11px] text-faint">
        Bars run from each job&apos;s creation to its last recorded state change (live jobs: until the last refresh). They are
        recorded bounds, not measured execution time.
      </p>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const { orgId, projectId } = useProjectScope();
  const { workflowId } = useParams<{ workflowId: string }>();
  const wf = useWorkflow(projectId, workflowId);
  // One query for every job this workflow spawned — replaces a poller per chip.
  const runs = useRuns(projectId, { workflowId, limit: 100 });
  const { nameOf } = useAgentNames(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: wf, backHref: `${base}/workflows`, backLabel: "All workflows", noun: "workflow" });
  if (state || !wf.data) return state;

  const w = wf.data;
  const template = WORKFLOW_BY_TYPE.get(w.workflowType);
  const live = LIVE_WORKFLOW_STATUSES.has(w.status);
  const jobRows = runs.data?.pages.flatMap((p) => p.jobs) ?? [];
  const statusById = new Map(jobRows.map((r) => [r.id, r.status]));
  const waitingOnApproval = jobRows.some((r) => r.status === "pending_approval");

  return (
    <DetailPage
      breadcrumbs={[{ label: "Workflows", href: `${base}/workflows` }, { label: w.id.slice(-8) }]}
      eyebrow={`Workflow · ${w.workflowType}${live ? " · updating live" : ""}`}
      title={template?.name ?? w.workflowType}
      id={w.id}
      status={<AnyStatusBadge value={w.status} />}
      facts={[
        { label: "Started", value: dateTime(w.createdAt) },
        { label: "Last update", value: dateTime(w.updatedAt) },
        { label: "Step", value: `${Math.min(w.currentStep + 1, w.steps.length)} of ${w.steps.length}` },
        { label: "Jobs spawned", value: runs.isLoading ? "…" : String(jobRows.length) },
      ]}
      aside={
        <>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-foreground">Why it can&apos;t double-spend</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Each step&apos;s jobs are enqueued with a deterministic request id per (workflow, step, attempt, index). A
              resumed advancer finds the job that already exists instead of spawning a second one.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium text-foreground">Why it survives a crash</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              One advancer holds a 30-second lease on this run and every state write is fenced by it. If that process
              dies, another advancer picks the run up where it stopped.
            </p>
          </div>
          {template ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">Step notes</p>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {template.steps.map((s) => (
                  <li key={s.name}>
                    <span className="font-mono text-foreground">{s.name}</span> — {s.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      }
    >
      {w.status === "paused" ? (
        <Callout tone="warning" title="Parked for a human">
          A quality gate failed after its one retry. The critique is on the step below.
        </Callout>
      ) : null}
      {w.lastError ? <Callout tone="error">{w.lastError}</Callout> : null}
      {waitingOnApproval ? (
        <Callout tone="warning" href={`${base}/approvals`} title="Generated pages are waiting in Approvals">
          This step joins once every page is approved or rejected.
        </Callout>
      ) : null}

      <Section title="Steps" description="The workflow graph, with every job it spawned.">
        <StepGraph
          steps={w.steps}
          currentStep={w.currentStep}
          jobHref={(id) => `${base}/runs/${id}`}
          statusOf={(id) => statusById.get(id)}
        />
      </Section>

      <Section
        title="Jobs over time"
        description="Every run this workflow spawned, on one time axis. Click a bar to open the run."
        actions={
          <Link href={`${base}/runs?workflow=${w.id}`} className="text-xs text-brand hover:underline">
            Open in Runs →
          </Link>
        }
      >
        <div className="rounded-xl border border-border bg-surface p-4">
          {runs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading jobs…</p>
          ) : (
            <JobSpans runs={jobRows} base={base} nameOf={nameOf} now={runs.dataUpdatedAt} />
          )}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2 text-xs text-faint">
        {[...new Set(jobRows.map((r) => r.status))].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", dotClass(s))} aria-hidden />
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </DetailPage>
  );
}
