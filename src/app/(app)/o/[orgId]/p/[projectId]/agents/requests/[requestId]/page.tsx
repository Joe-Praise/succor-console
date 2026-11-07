"use client";

import { useParams } from "next/navigation";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useAgentRequests } from "@/features/projects/hooks";
import { RequestTimeline } from "@/features/agents/request-timeline";
import { dateTime, shortId } from "@/lib/format";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Section } from "@/components/ops/primitives";

export default function AgentRequestPage() {
  const { orgId, projectId } = useProjectScope();
  const { requestId } = useParams<{ requestId: string }>();
  const requests = useAgentRequests(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: requests, backHref: `${base}/agents`, backLabel: "Agents", noun: "agent request" });
  if (state) return state;
  const r = requests.data?.requests.find((x) => x._id === requestId);
  if (!r) return <DetailNotFound backHref={`${base}/agents`} backLabel="Agents" noun="agent request" />;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Agents", href: `${base}/agents` }, { label: "Request" }, { label: r.title }]}
      eyebrow="Custom agent request"
      title={r.title}
      id={r._id}
      status={<AnyStatusBadge value={r.status} />}
      facts={[
        { label: "Requested", value: dateTime(r.createdAt) },
        { label: "Requested by", value: <span className="font-mono text-xs">{shortId(r.requestedBy)}</span> },
        { label: "Status", value: (r.status ?? "pending").replace(/_/g, " ") },
        { label: "Project", value: <span className="font-mono text-xs">{r.projectId}</span> },
      ]}
    >
      <Section title="Progress">
        <div className="tile p-4">
          <RequestTimeline status={r.status ?? "pending"} />
        </div>
      </Section>
      <Section title="What it should do">
        <p className="tile p-4 text-sm whitespace-pre-wrap text-foreground">{r.description}</p>
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Inputs you can provide">
          <p className="tile p-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {r.desiredInputs || "—"}
          </p>
        </Section>
        <Section title="Callback you expect">
          <p className="tile p-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {r.desiredCallback || "—"}
          </p>
        </Section>
      </div>
      <Section title="Notes from the platform team">
        {r.adminNotes ? (
          <p className="rounded-xl bg-brand-muted p-4 text-sm whitespace-pre-wrap text-foreground">{r.adminNotes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </Section>
    </DetailPage>
  );
}
