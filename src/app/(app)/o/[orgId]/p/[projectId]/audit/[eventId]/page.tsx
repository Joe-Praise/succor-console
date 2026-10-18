"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FingerprintIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useAuditEvent } from "@/features/executions/hooks";
import { dateTime } from "@/lib/format";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { Section, IdChip } from "@/components/ops/primitives";
import { AUDIT_ACTION_COPY } from "@/features/governance/audit-copy";

const OUTCOME_COPY: Record<string, string> = {
  allowed: "The action was carried out.",
  conflict: "Someone else decided first, or the record was no longer in the expected state — nothing changed.",
  refused: "The platform refused the action (for example, the held delivery was erased or unreadable).",
};

export default function AuditEventPage() {
  const { orgId, projectId } = useProjectScope();
  const { eventId } = useParams<{ eventId: string }>();
  const q = useAuditEvent(projectId, eventId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: q, backHref: `${base}/audit`, backLabel: "Audit ledger", noun: "audit event" });
  if (state || !q.data) return state;
  const e = q.data.event;

  const targetHref =
    e.targetType === "agentJob" && e.targetId
      ? `${base}/runs/${e.targetId}`
      : e.targetType === "workflow" && e.targetId
        ? `${base}/workflows/${e.targetId}`
        : null;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Audit", href: `${base}/audit` }, { label: e.id.slice(-8) }]}
      eyebrow={`Audit · ${e.action ?? "event"}`}
      title={AUDIT_ACTION_COPY[e.action ?? ""] ?? e.action ?? "Audit event"}
      id={e.id}
      status={<AnyStatusBadge value={e.outcome} />}
      facts={[
        { label: "Recorded", value: dateTime(e.ts) },
        { label: "Actor", value: <span className="font-mono text-xs">{e.actor}</span> },
        { label: "Agent", value: e.agentType ? <span className="font-mono text-xs">{e.agentType}</span> : "—" },
        { label: "Category", value: e.category ?? "—" },
      ]}
      aside={
        <div className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
          <FingerprintIcon className="size-4 text-brand" />
          <p className="font-medium text-foreground">Signed at write</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This row was signed with an HMAC when it was inserted and can&apos;t be edited or deleted through the
            service. Verification runs server-side; the signature isn&apos;t sent to your browser.
          </p>
          <Link href={`${base}/audit?action=${e.action ?? ""}`} className="block pt-1 text-brand hover:underline">
            More events like this
          </Link>
        </div>
      }
    >
      <Section title="Outcome">
        <p className="text-sm text-muted-foreground">{OUTCOME_COPY[e.outcome ?? ""] ?? "—"}</p>
      </Section>

      <Section title="Target" description="The record this action was taken on.">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="text-muted-foreground">{e.targetType}</span>
          {e.targetId ? <IdChip id={e.targetId} full /> : null}
          {targetHref ? (
            <Link href={targetHref} className="text-brand hover:underline">
              Open {e.targetType === "agentJob" ? "the run" : "the workflow"} →
            </Link>
          ) : null}
        </div>
      </Section>

      {e.counts || e.noteLength != null ? (
        <Section title="Details">
          <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-3">
            {e.counts
              ? Object.entries(e.counts).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-faint">{k}</dt>
                    <dd className="tabular-nums text-foreground">{v}</dd>
                  </div>
                ))
              : null}
            {e.noteLength != null ? (
              <div>
                <dt className="text-xs text-faint">Reviewer note</dt>
                <dd className="text-foreground">{e.noteLength} characters (text not stored in the ledger)</dd>
              </div>
            ) : null}
          </dl>
        </Section>
      ) : null}
    </DetailPage>
  );
}
