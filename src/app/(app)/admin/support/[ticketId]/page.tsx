"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useAdminTickets, useAdminProjects } from "@/features/admin/hooks";
import { TicketEditor } from "@/features/admin/ticket-editor";
import type { AdminProjectRow } from "@/features/admin/project-config";
import { dateTime, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Section } from "@/components/ops/primitives";

export default function AdminTicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const tickets = useAdminTickets();
  const projects = useAdminProjects();

  const state = renderDetailState({ query: tickets, backHref: "/admin/support", backLabel: "All tickets", noun: "ticket" });
  if (state) return state;
  const t = tickets.data?.tickets.find((x) => x._id === ticketId);
  if (!t) return <DetailNotFound backHref="/admin/support" backLabel="All tickets" noun="ticket" />;
  const orgId = ((projects.data?.projects ?? []) as AdminProjectRow[]).find((p) => p.projectId === t.projectId)?.orgId;
  const jobIds = [...new Set(t.message.match(/\b[a-f0-9]{24}\b/gi) ?? [])];

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Support", href: "/admin/support" }, { label: t.subject }]}
      eyebrow={`Ticket · ${t.projectId}`}
      title={t.subject}
      id={t._id}
      status={<StatusBadge status={t.status} />}
      facts={[
        { label: "Opened", value: dateTime(t.createdAt) },
        { label: "Updated", value: dateTime(t.updatedAt) },
        { label: "Project", value: <Link href={`/admin/projects/${t.projectId}`} className="font-mono text-xs text-brand hover:underline">{t.projectId}</Link> },
        { label: "Opened by", value: <Link href={`/admin/users/${t.openedBy}`} className="font-mono text-xs text-brand hover:underline">{shortId(t.openedBy)}</Link> },
      ]}
    >
      {jobIds.length && orgId ? (
        <Section title="Runs mentioned">
          <div className="flex flex-wrap gap-2 text-xs">
            {jobIds.map((id) => (
              <Link key={id} href={`/o/${orgId}/p/${t.projectId}/runs/${id}`} className="font-mono text-brand hover:underline">
                {shortId(id)}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
      <Section title="Ticket">
        <TicketEditor key={`${t._id}-${t.updatedAt?.toISOString() ?? ""}`} ticket={t} />
      </Section>
    </DetailPage>
  );
}
