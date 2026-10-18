"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, SearchXIcon, PauseCircleIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useWorkflow, LIVE_WORKFLOW_STATUSES } from "@/features/runtime/hooks";
import { StepGraph } from "@/features/runtime/step-graph";
import { WORKFLOW_BY_TYPE } from "@/features/runtime/workflow-templates";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";

export default function WorkflowDetailPage() {
  const { orgId, projectId } = useProjectScope();
  const { workflowId } = useParams<{ workflowId: string }>();
  const wf = useWorkflow(projectId, workflowId);
  const base = `/o/${orgId}/p/${projectId}`;

  const back = (
    <Button variant="ghost" size="sm" render={<Link href={`${base}/workflows`} />}>
      <ArrowLeftIcon />
      All workflows
    </Button>
  );

  if (wf.isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }
  if (wf.isError || !wf.data) {
    const notFound = wf.error instanceof ApiError && wf.error.status === 404;
    return (
      <div className="space-y-6">
        {back}
        {notFound ? (
          <EmptyState
            icon={SearchXIcon}
            title="Workflow not found"
            description="It doesn't exist in this project."
          />
        ) : (
          <QueryError message="Couldn't load this workflow." onRetry={() => void wf.refetch()} />
        )}
      </div>
    );
  }

  const w = wf.data;
  const template = WORKFLOW_BY_TYPE.get(w.workflowType);
  const live = LIVE_WORKFLOW_STATUSES.has(w.status);
  const waitingOnApproval = w.steps.some((s) => s.agentType === "seo-page-factory" && s.status === "running");

  return (
    <div className="space-y-8">
      {back}
      <PageHeader
        title={template?.name ?? w.workflowType}
        description={`Run ${w.id} · started ${w.createdAt ? w.createdAt.toLocaleString() : "—"}${live ? " · updating live" : ""}`}
        action={<AnyStatusBadge value={w.status} />}
      />

      {w.status === "paused" ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
          <PauseCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Parked for a human: a quality gate failed after its one retry. The critique is on the
            step below.
          </p>
        </div>
      ) : null}

      {w.lastError ? (
        <p className="rounded-lg bg-error-bg px-4 py-3 font-mono text-xs wrap-break-word text-error">
          {w.lastError}
        </p>
      ) : null}

      {waitingOnApproval ? (
        <Link
          href={`${base}/approvals`}
          className="block rounded-xl border border-border bg-warning-bg px-4 py-3 text-sm text-warning transition-colors hover:border-strong"
        >
          Generated pages wait in <span className="font-medium">Approvals</span> — this step joins
          once every page is approved or rejected. Review →
        </Link>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <StepGraph
          steps={w.steps}
          currentStep={w.currentStep}
          jobHref={(id) => `${base}/jobs/${id}`}
        />
        <aside className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-foreground">Why it can&apos;t double-spend</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Each step&apos;s jobs are enqueued with a deterministic request id per
              (workflow, step, attempt, index). A resumed advancer finds the job that already exists
              instead of spawning a second one.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium text-foreground">Why it survives a crash</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              One advancer holds a 30-second lease on this run and every state write is fenced by
              it. If that process dies, another advancer picks the run up where it stopped.
            </p>
          </div>
          {template ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium text-foreground">Step notes</p>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {template.steps.map((s) => (
                  <li key={s.name}>
                    <span className="font-mono text-foreground">{s.name}</span> — {s.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
