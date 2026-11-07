"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useAdminLogs, useAdminProjects } from "@/features/admin/hooks";
import type { AdminLogRow } from "@/features/admin/admin-log";
import type { AdminProjectRow } from "@/features/admin/project-config";
import { dateTime, duration, usdPrecise, tokens } from "@/lib/format";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Callout, Section, IdChip } from "@/components/ops/primitives";

export default function AdminLogPage() {
  const { logId } = useParams<{ logId: string }>();
  // The admin feed has no single-record read; the page selects from the latest feed
  // (up to 200 rows), so very old records may not be reachable here.
  const logs = useAdminLogs({});
  const projects = useAdminProjects();

  const state = renderDetailState({ query: logs, backHref: "/admin/logs", backLabel: "Run feed", noun: "log record" });
  if (state) return state;
  const l = ((logs.data?.logs ?? []) as AdminLogRow[]).find((x) => x._id === logId);
  if (!l) return <DetailNotFound backHref="/admin/logs" backLabel="Run feed" noun="log record" />;
  const project = ((projects.data?.projects ?? []) as AdminProjectRow[]).find((p) => p.projectId === l.projectId);

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Run feed", href: "/admin/logs" }, { label: logId.slice(-8) }]}
      eyebrow={`Run log · ${l.projectId}`}
      title={l.agentType ?? "Run"}
      id={logId}
      status={<AnyStatusBadge value={l.status} />}
      facts={[
        { label: "Recorded", value: dateTime(l.ts) },
        { label: "Model", value: <span className="font-mono text-xs">{l.model ?? "—"}</span> },
        { label: "Duration", value: duration(l.durationMs) },
        { label: "Initiated by", value: <span className="font-mono text-xs">{l.initiatedBy ?? "—"}</span> },
      ]}
      aside={
        <div className="space-y-2 tile p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Related</p>
          <Link href={`/admin/projects/${l.projectId}`} className="block text-brand hover:underline">
            Project {l.projectId}
          </Link>
          {l.jobId && project?.orgId ? (
            <Link href={`/o/${project.orgId}/p/${l.projectId}/runs/${l.jobId}`} className="block text-brand hover:underline">
              Open the run in the console
            </Link>
          ) : null}
          <Link href={`/admin/logs?project=${l.projectId}`} className="block text-brand hover:underline">
            This project&apos;s run feed
          </Link>
        </div>
      }
    >
      <Section title="Price">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Tokens", tokens((l.inputTokens ?? 0) + (l.outputTokens ?? 0) + (l.embeddingTokens ?? 0))],
            ["Provider cost", usdPrecise(l.estimatedCostUsd)],
            ["Markup", l.markupMultiplier ? `× ${l.markupMultiplier}` : "—"],
            ["Billed", usdPrecise(l.billedUsd)],
          ].map(([label, value]) => (
            <div key={label} className="tile p-4">
              <p className="text-xs text-faint">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-faint">Gain on this row: {usdPrecise((l.billedUsd ?? 0) - (l.estimatedCostUsd ?? 0))}.</p>
      </Section>
      {l.jobId ? (
        <Section title="Job">
          <IdChip id={l.jobId} full />
        </Section>
      ) : null}
      {l.errorMessage ? (
        <Section title="Error">
          <Callout tone="error">
            <span className="font-mono text-xs wrap-break-word">{l.errorMessage}</span>
          </Callout>
        </Section>
      ) : null}
    </DetailPage>
  );
}
