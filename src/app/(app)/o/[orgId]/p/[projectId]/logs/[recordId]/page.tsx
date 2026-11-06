"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useUsageRecord, useExecution } from "@/features/executions/hooks";
import { primaryDelivery } from "@/features/executions/diagnostics";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { dateTime, duration, usdPrecise, tokens } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { Callout, IdChip, Section, StatusTriplet } from "@/components/ops/primitives";

function LinkedRun({ projectId, jobId, base }: { projectId: string; jobId: string; base: string }) {
  const exec = useExecution(projectId, jobId);
  if (exec.isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (exec.isError || !exec.data) {
    return (
      <p className="text-sm text-muted-foreground">
        The run <span className="font-mono">{jobId}</span> isn&apos;t readable any more (it may predate run records).
      </p>
    );
  }
  const rec = exec.data;
  return (
    <div className="space-y-3 tile p-4">
      <StatusTriplet jobStatus={rec.job.status} runStatus={rec.job.runStatus} delivery={primaryDelivery(rec)} />
      <p className="text-xs text-muted-foreground">
        {rec.usage.length} priced row{rec.usage.length === 1 ? "" : "s"} on this run ·{" "}
        {usdPrecise(rec.usage.reduce((s, r) => s + (r.billedUsd ?? 0), 0))} billed in total
      </p>
      <Button size="sm" variant="outline" render={<Link href={`${base}/runs/${jobId}`} />}>
        Open the run
        <ArrowRightIcon />
      </Button>
    </div>
  );
}

export default function UsageRecordPage() {
  const { orgId, projectId } = useProjectScope();
  const { recordId } = useParams<{ recordId: string }>();
  const q = useUsageRecord(projectId, recordId);
  const { nameOf } = useAgentNames(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: q, backHref: `${base}/logs`, backLabel: "All logs", noun: "usage record" });
  if (state || !q.data) return state;
  const r = q.data.record;
  const totalTokens = (r.inputTokens ?? 0) + (r.outputTokens ?? 0) + (r.embeddingTokens ?? 0);

  return (
    <DetailPage
      breadcrumbs={[{ label: "Logs", href: `${base}/logs` }, { label: r.id.slice(-8) }]}
      eyebrow="Usage record"
      title={nameOf(r.agentType)}
      id={r.id}
      status={<AnyStatusBadge value={r.status} />}
      facts={[
        { label: "Recorded", value: dateTime(r.ts) },
        { label: "Model", value: <span className="font-mono text-xs">{r.model}</span> },
        { label: "Duration", value: duration(r.durationMs) },
        { label: "Initiated by", value: <span className="font-mono text-xs">{r.initiatedBy ?? "—"}</span> },
      ]}
      aside={
        <div className="space-y-3 tile p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">About this record</p>
          <p className="text-muted-foreground">
            Written once, when the run reached its final state, and never changed after. The markup and pricing version
            are snapshotted on the row, so later price changes never rewrite history.
          </p>
          <Link href={`${base}/logs?agent=${r.agentType}`} className="block text-brand hover:underline">
            Other records for this agent
          </Link>
          <Link href={`${base}/usage`} className="block text-brand hover:underline">
            Usage &amp; economics
          </Link>
        </div>
      }
    >
      <Section title="How the price was computed">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Tokens", tokens(totalTokens), `${tokens(r.inputTokens)} in · ${tokens(r.outputTokens)} out · ${tokens(r.embeddingTokens)} embedding`],
            ["Provider cost", usdPrecise(r.estimatedCostUsd), `rate card ${r.pricingVersion ?? "unknown"}`],
            ["Markup", r.markupMultiplier ? `× ${r.markupMultiplier}` : "—", "snapshotted on this row"],
            ["Billed", usdPrecise(r.billedUsd), "provider cost × markup"],
          ].map(([label, value, sub]) => (
            <div key={label} className="tile p-4">
              <p className="text-xs text-faint">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
              <p className="mt-0.5 text-[11px] text-faint">{sub}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Provider cost combines chat and embedding tokens; the split isn&apos;t stored. Tool calls, infrastructure and
          delivery aren&apos;t metered.
        </p>
      </Section>

      {r.errorMessage ? (
        <Section title="Error">
          <Callout tone="error">
            <span className="font-mono text-xs wrap-break-word">{r.errorMessage}</span>
          </Callout>
        </Section>
      ) : null}

      <Section title="Run" description="The durable job this record was metered for.">
        {r.jobId ? (
          <div className="space-y-2">
            <IdChip id={r.jobId} label="job" />
            <LinkedRun projectId={projectId} jobId={r.jobId} base={base} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No run is linked — records from before durable jobs, and the synchronous{" "}
            <span className="font-mono">reindex-content</span> utility, have no job.
          </p>
        )}
      </Section>
    </DetailPage>
  );
}
