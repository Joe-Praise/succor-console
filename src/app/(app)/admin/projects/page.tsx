"use client";

import { toast } from "sonner";
import { FolderKanbanIcon } from "lucide-react";

import { useAdminProjects, useApproveProject, useSuspendProject } from "@/features/admin/hooks";
import type { AdminProjectRow } from "@/features/admin/project-config";
import { usd } from "@/lib/format";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ops/data-table";

export default function AdminProjectsPage() {
  const projects = useAdminProjects();
  const approve = useApproveProject();
  const suspend = useSuspendProject();

  const rows = (projects.data?.projects ?? []) as AdminProjectRow[];

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Approve, suspend, and configure markup, caps, and agent enablement."
      />

      {projects.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects"
          description="Projects appear here as organizations create them."
        />
      ) : (
        <DataTable
          rows={rows}
          getRowKey={(p) => p.projectId ?? ""}
          getRowHref={(p) => (p.projectId ? `/admin/projects/${p.projectId}` : null)}
          getRowLabel={(p) => `Open project ${p.name}`}
          columns={[
            {
              id: "project",
              header: "Project",
              cell: (p) => (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-mono text-[11px] text-faint">{p.projectId}</span>
                </div>
              ),
            },
            { id: "org", header: "Org", cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.orgId ?? "—"}</span> },
            { id: "status", header: "Status", cell: (p) => <StatusBadge status={(p.status ?? "approved") as Status} /> },
            { id: "billed", header: "Billed (month)", align: "right", cell: (p) => usd(p.currentMonthUsage?.billedUsd ?? 0) },
            {
              id: "markup",
              header: "Markup",
              align: "right",
              cell: (p) => <span className="text-muted-foreground">{p.markupMultiplier != null ? `${p.markupMultiplier}×` : "default"}</span>,
            },
            {
              id: "cap",
              header: "Cap",
              align: "right",
              cell: (p) => <span className="text-muted-foreground">{p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—"}</span>,
            },
            {
              id: "actions",
              header: "",
              align: "right",
              interactive: true,
              cell: (p) =>
                p.status !== "approved" ? (
                  <Button
                    size="xs"
                    disabled={approve.isPending}
                    onClick={() =>
                      p.projectId &&
                      approve.mutate(p.projectId, { onSuccess: () => toast.success(`${p.name} approved`), onError })
                    }
                  >
                    Approve
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={suspend.isPending}
                    onClick={() => {
                      if (!p.projectId || !window.confirm(`Suspend ${p.name}? Its agent calls are refused immediately.`)) return;
                      suspend.mutate(p.projectId, { onSuccess: () => toast.success(`${p.name} suspended`), onError });
                    }}
                  >
                    Suspend
                  </Button>
                ),
            },
          ]}
        />
      )}

    </div>
  );
}
