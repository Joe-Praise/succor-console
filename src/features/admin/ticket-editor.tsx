"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { usePatchAdminTicket } from "@/features/admin/hooks";
import { ApiError } from "@/api/client";
import type { SupportTicket, TicketStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

/** Status + reply editor for one ticket (list cards and the ticket page). */
export function TicketEditor({ ticket, linkToDetail = false }: { ticket: SupportTicket; linkToDetail?: boolean }) {
  const patch = usePatchAdminTicket();
  const [notes, setNotes] = useState(ticket.adminNotes ?? "");

  function save(status: TicketStatus) {
    patch.mutate(
      { id: ticket._id, status, adminNotes: notes.trim() ? notes : null },
      {
        onSuccess: () => toast.success(`Ticket ${status.replace("_", " ")}`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Update failed"),
      },
    );
  }

  return (
    <div className="tile p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {linkToDetail ? (
            <Link href={`/admin/support/${ticket._id}`} className="text-sm font-medium text-foreground hover:text-brand">
              {ticket.subject}
            </Link>
          ) : (
            <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
          )}
          <p className="font-mono text-xs text-muted-foreground">
            {ticket.projectId} · {ticket.createdAt ? ticket.createdAt.toLocaleString() : "—"}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">{ticket.message}</p>
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <Textarea
          rows={2}
          maxLength={4000}
          aria-label="Reply to the tenant"
          placeholder="Reply — the tenant sees this on their Support page."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="xs"
              variant={s === ticket.status ? "secondary" : "outline"}
              disabled={patch.isPending}
              onClick={() => save(s)}
            >
              {patch.isPending && patch.variables?.status === s ? <Loader2Icon className="animate-spin" /> : null}
              {s === ticket.status ? "Save note" : `Mark ${s.replace("_", " ")}`}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

