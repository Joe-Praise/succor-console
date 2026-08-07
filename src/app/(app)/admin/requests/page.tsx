"use client";

import { toast } from "sonner";
import { InboxIcon, ChevronDownIcon } from "lucide-react";

import { useAdminAgentRequests, usePatchAdminAgentRequest } from "@/features/admin/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/api/client";

const STATUSES = ["pending", "in_review", "approved", "building", "delivered", "rejected"] as const;

interface RequestRow {
  _id?: string;
  projectId?: string;
  title?: string;
  description?: string;
  desiredInputs?: string;
  desiredCallback?: string;
  status?: string;
  createdAt?: string;
}

export default function AdminRequestsPage() {
  const requests = useAdminAgentRequests();
  const patch = usePatchAdminAgentRequest();
  const rows = (requests.data?.requests ?? []) as RequestRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agent requests"
        description="Managed agent development — the pipeline from request to delivered."
      />

      {requests.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No requests"
          description="Tenant requests for custom agents land here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r._id ?? i} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">{r.projectId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={(r.status ?? "pending") as Status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="xs">
                          Move to
                          <ChevronDownIcon className="text-faint" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {STATUSES.filter((s) => s !== r.status).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() =>
                            r._id &&
                            patch.mutate(
                              { id: r._id, status: s },
                              {
                                onSuccess: () => toast.success(`Moved to ${s.replace("_", " ")}`),
                                onError: (err) =>
                                  toast.error(err instanceof ApiError ? err.message : "Update failed"),
                              },
                            )
                          }
                        >
                          <span className="capitalize">{s.replace("_", " ")}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
              {r.desiredInputs || r.desiredCallback ? (
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  {r.desiredInputs ? (
                    <p>
                      <span className="font-medium text-foreground">Inputs:</span> {r.desiredInputs}
                    </p>
                  ) : null}
                  {r.desiredCallback ? (
                    <p>
                      <span className="font-medium text-foreground">Callback:</span> {r.desiredCallback}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
