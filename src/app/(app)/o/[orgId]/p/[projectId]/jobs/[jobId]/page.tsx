"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, SearchXIcon, StampIcon, TriangleAlertIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog, useProjectSetup } from "@/features/projects/hooks";
import { useJob, LIVE_JOB_STATUSES } from "@/features/runtime/hooks";
import { LifecycleRail } from "@/features/runtime/lifecycle-rail";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/code-block";
import { JsonPanel } from "@/components/json-panel";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-xs text-faint">{label}</p>
      <div className="truncate text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function JobDetailPage() {
  const { orgId, projectId } = useProjectScope();
  const { jobId } = useParams<{ jobId: string }>();
  const job = useJob(jobId);
  const catalog = useCatalog(projectId);
  const setup = useProjectSetup(projectId);

  const base = `/o/${orgId}/p/${projectId}`;
  const back = (
    <Button variant="ghost" size="sm" render={<Link href={`${base}/jobs`} />}>
      <ArrowLeftIcon />
      All jobs
    </Button>
  );

  if (job.isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (job.isError) {
    const notFound = job.error instanceof ApiError && job.error.status === 404;
    return (
      <div className="space-y-6">
        {back}
        {notFound ? (
          <EmptyState
            icon={SearchXIcon}
            title="Job not found"
            description="It doesn't exist, or it belongs to a project you can't see. Job IDs are only readable by members of the job's project."
          />
        ) : (
          <QueryError message="Couldn't load this job." onRetry={() => void job.refetch()} />
        )}
      </div>
    );
  }

  const j = job.data!.job;
  const entry = catalog.data?.catalog.find((e) => e.agentType === j.agentType);
  const gated = entry?.riskTier === "high";
  const live = LIVE_JOB_STATUSES.has(j.status);
  const serviceUrl = setup.data?.serviceUrl ?? "$SUCCOR_API_URL";

  return (
    <div className="space-y-8">
      {back}
      <PageHeader
        title={entry?.name ?? j.agentType}
        description={`Job ${j._id}${live ? " · updating live" : ""}`}
        action={<AnyStatusBadge value={j.status} />}
      />

      {j.projectId !== projectId ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This job belongs to project <span className="font-mono">{j.projectId}</span>, not the one
            you have open.
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-6 pt-6">
          <LifecycleRail status={j.status} gated={gated} attempt={j.attempt} maxAttempts={j.maxAttempts} />
          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-5">
            <Fact label="Agent">
              <span className="font-mono text-xs">{j.agentType}</span>
            </Fact>
            <Fact label="Run outcome">
              {j.runStatus ? <AnyStatusBadge value={j.runStatus} /> : <span className="text-faint">not yet</span>}
            </Fact>
            <Fact label="Attempts">
              <span className="tabular-nums">
                {j.attempt} / {j.maxAttempts}
              </span>
            </Fact>
            <Fact label="Initiated by">
              <span className="font-mono text-xs" title={j.initiatedBy}>
                {j.initiatedBy}
              </span>
            </Fact>
            <Fact label="Updated">{j.updatedAt ? j.updatedAt.toLocaleString() : "—"}</Fact>
          </div>
        </CardContent>
      </Card>

      {j.status === "pending_approval" ? (
        <Link
          href={`${base}/approvals`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-warning-bg px-4 py-3 text-sm text-warning transition-colors hover:border-strong"
        >
          <span className="flex items-center gap-2">
            <StampIcon className="size-4" aria-hidden />
            Output is ready. Delivery to your API is held until an admin approves it.
          </span>
          <span className="font-medium">Review →</span>
        </Link>
      ) : null}

      {j.lastError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last error</CardTitle>
            <CardDescription>
              Sanitized diagnostic from the most recent attempt. Protected agents never surface raw
              provider text here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-error-bg px-3 py-2 font-mono text-xs wrap-break-word text-error">
              {j.lastError}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">Result</h2>
          <p className="text-sm text-muted-foreground">
            The run&apos;s output as the worker stored it. The same payload is delivered to your
            callback{gated ? " once approved" : ""}.
          </p>
        </div>
        {j.resultUndecodable ? (
          <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
            This result is encrypted under a key that is no longer available, so it can&apos;t be
            shown. The job&apos;s control-plane state above is still accurate.
          </p>
        ) : (
          <JsonPanel
            value={j.result}
            label="result"
            empty={
              live
                ? "Still running — the result appears here when the job settles."
                : "No stored result (none produced, or erased by retention)."
            }
          />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">Poll it from your backend</h2>
          <p className="text-sm text-muted-foreground">
            The callback is the push channel; this endpoint is the pull channel. Use it to reconcile
            or to show progress in your own UI.
          </p>
        </div>
        <CodeBlock
          label="GET /agents/jobs/:jobId"
          code={`curl ${serviceUrl.replace(/\/$/, "")}/agents/jobs/${j._id} \\
  -H "Authorization: Bearer $SUCCOR_API_KEY"

# → 200 { "job": { "status": "${j.status}", "attempt": ${j.attempt}, "maxAttempts": ${j.maxAttempts}, "result": … } }
# → 404 for a job outside your project (existence is never leaked)`}
        />
      </section>
    </div>
  );
}
