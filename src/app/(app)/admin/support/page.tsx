"use client";

import { useState } from "react";
import { LifeBuoyIcon } from "lucide-react";

import { useAdminTickets } from "@/features/admin/hooks";
import { TicketEditor } from "@/features/admin/ticket-editor";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FILTERS = ["open", "in_progress", "resolved", "closed", "all"] as const;

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
            <TicketEditor key={`${t._id}-${t.updatedAt?.toISOString() ?? ""}`} ticket={t} linkToDetail />
          ))}
        </div>
      )}
    </div>
  );
}
