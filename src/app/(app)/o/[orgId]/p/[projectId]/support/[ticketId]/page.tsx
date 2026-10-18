"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useTickets } from "@/features/governance/hooks";
import { dateTime, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Section } from "@/components/ops/primitives";

const STATUS_COPY: Record<string, string> = {
  open: "Waiting for the support team.",
  in_progress: "The support team is working on it.",
  resolved: "Marked resolved. Open a new ticket if it comes back.",
  closed: "Closed.",
};

export default function SupportTicketPage() {
  const { orgId, projectId } = useProjectScope();
  const { ticketId } = useParams<{ ticketId: string }>();
  const tickets = useTickets(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: tickets, backHref: `${base}/support`, backLabel: "All tickets", noun: "ticket" });
  if (state) return state;
  const t = tickets.data?.tickets.find((x) => x._id === ticketId);
  if (!t) return <DetailNotFound backHref={`${base}/support`} backLabel="All tickets" noun="ticket" />;

  // Job ids pasted into the message become links to the run.
  const jobIds = [...new Set(t.message.match(/\b[a-f0-9]{24}\b/gi) ?? [])];

  return (
    <DetailPage
      breadcrumbs={[{ label: "Support", href: `${base}/support` }, { label: t.subject }]}
      eyebrow="Support ticket"
      title={t.subject}
      id={t._id}
      status={<StatusBadge status={t.status} />}
      facts={[
        { label: "Opened", value: dateTime(t.createdAt) },
        { label: "Last update", value: dateTime(t.updatedAt) },
        { label: "Opened by", value: <span className="font-mono text-xs">{shortId(t.openedBy)}</span> },
        { label: "Status", value: STATUS_COPY[t.status] ?? t.status },
      ]}
    >
      <Section title="Your message">
        <p className="rounded-xl border border-border bg-surface p-4 text-sm whitespace-pre-wrap text-foreground">{t.message}</p>
        {jobIds.length ? (
          <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            Runs mentioned:
            {jobIds.map((id) => (
              <Link key={id} href={`${base}/runs/${id}`} className="font-mono text-brand hover:underline">
                {shortId(id)}
              </Link>
            ))}
          </p>
        ) : null}
      </Section>
      <Section title="Reply from support">
        {t.adminNotes ? (
          <p className="rounded-xl bg-brand-muted p-4 text-sm whitespace-pre-wrap text-foreground">{t.adminNotes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No reply yet.</p>
        )}
      </Section>
    </DetailPage>
  );
}
