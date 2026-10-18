"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoyIcon, Loader2Icon } from "lucide-react";

import { useAdminTickets, usePatchAdminTicket } from "@/features/admin/hooks";
import { ApiError } from "@/api/client";
import type { SupportTicket, TicketStatus } from "@/types";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FILTERS = ["open", "in_progress", "resolved", "closed", "all"] as const;
const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

function TicketRow({ ticket }: { ticket: SupportTicket }) {
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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
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

export default function AdminSupportPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const tickets = useAdminTickets(filter === "all" ? undefined : filter);
  const rows = tickets.data?.tickets ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Support" description="Tenant tickets across every project. Your reply is visible to the tenant." />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f} className="capitalize">
              {f.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tickets.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : tickets.isError ? (
        <QueryError message="Couldn't load tickets." onRetry={() => void tickets.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={LifeBuoyIcon} title="Inbox zero" description="No tickets in this state." />
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <TicketRow key={`${t._id}-${t.updatedAt?.toISOString() ?? ""}`} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
