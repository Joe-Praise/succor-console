"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { useAdminAgentRequests, usePatchAdminAgentRequest } from "@/features/admin/hooks";
import { RequestTimeline } from "@/features/agents/request-timeline";
import { ApiError } from "@/api/client";
import { dateTime, shortId } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Section } from "@/components/ops/primitives";

const STATUSES = ["pending", "in_review", "approved", "building", "delivered", "rejected"] as const;

interface RequestRow {
  _id?: string;
  projectId?: string;
  requestedBy?: string;
  title?: string;
  description?: string;
  desiredInputs?: string;
  desiredCallback?: string;
  status?: string;
  adminNotes?: string | null;
  createdAt?: string;
}

function NotesEditor({ request }: { request: RequestRow }) {
  const patch = usePatchAdminAgentRequest();
  const [notes, setNotes] = useState(request.adminNotes ?? "");
  const save = (status: string) =>
    request._id &&
    patch.mutate(
      { id: request._id, status, adminNotes: notes.trim() ? notes : null },
      {
        onSuccess: () => toast.success(status === request.status ? "Notes saved" : `Moved to ${status.replace("_", " ")}`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Update failed"),
      },
    );
  return (
    <div className="space-y-3">
      <Textarea
        rows={4}
        maxLength={4000}
        aria-label="Notes for the requester"
        placeholder="Notes the requesting team will see on their request page."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="xs"
            variant={s === request.status ? "secondary" : "outline"}
            disabled={patch.isPending}
            onClick={() => save(s)}
          >
            {patch.isPending && patch.variables?.status === s ? <Loader2Icon className="animate-spin" /> : null}
            {s === request.status ? "Save notes" : `Move to ${s.replace("_", " ")}`}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function AdminRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const requests = useAdminAgentRequests();

  const state = renderDetailState({ query: requests, backHref: "/admin/requests", backLabel: "All requests", noun: "agent request" });
  if (state) return state;
  const r = ((requests.data?.requests ?? []) as RequestRow[]).find((x) => x._id === requestId);
  if (!r) return <DetailNotFound backHref="/admin/requests" backLabel="All requests" noun="agent request" />;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Requests", href: "/admin/requests" }, { label: r.title ?? requestId }]}
      eyebrow="Custom agent request"
      title={r.title ?? "Request"}
      id={requestId}
      status={<AnyStatusBadge value={r.status} />}
      facts={[
        { label: "Project", value: <Link href={`/admin/projects/${r.projectId}`} className="font-mono text-xs text-brand hover:underline">{r.projectId}</Link> },
        { label: "Requested by", value: r.requestedBy ? <Link href={`/admin/users/${r.requestedBy}`} className="font-mono text-xs text-brand hover:underline">{shortId(r.requestedBy)}</Link> : "—" },
        { label: "Requested", value: dateTime(r.createdAt) },
        { label: "Status", value: (r.status ?? "pending").replace(/_/g, " ") },
      ]}
    >
      <Section title="Pipeline">
        <div className="tile p-4">
          <RequestTimeline status={r.status ?? "pending"} />
        </div>
      </Section>
      <Section title="What it should do">
        <p className="tile p-4 text-sm whitespace-pre-wrap">{r.description}</p>
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Inputs they can provide">
          <p className="tile p-4 text-sm whitespace-pre-wrap text-muted-foreground">{r.desiredInputs || "—"}</p>
        </Section>
        <Section title="Callback they expect">
          <p className="tile p-4 text-sm whitespace-pre-wrap text-muted-foreground">{r.desiredCallback || "—"}</p>
        </Section>
      </div>
      <Section title="Status & notes" description="The requester sees the status timeline and your notes.">
        <NotesEditor key={`${r._id}-${r.status}-${r.adminNotes ?? ""}`} request={r} />
      </Section>
    </DetailPage>
  );
}
