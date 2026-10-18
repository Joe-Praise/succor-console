"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2Icon } from "lucide-react";

import { useAdminOrgs, useApproveOrg, useSuspendOrg } from "@/features/admin/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ops/data-table";
import { ApiError } from "@/api/client";

const FILTERS = ["all", "pending", "approved", "suspended"] as const;

function OrgsInner() {
  const params = useSearchParams();
  const initial = (params.get("status") ?? "all") as (typeof FILTERS)[number];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(
    FILTERS.includes(initial) ? initial : "all",
  );
  const orgs = useAdminOrgs(filter === "all" ? undefined : filter);
  const approve = useApproveOrg();
  const suspend = useSuspendOrg();

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizations"
        description="Approve to let an org's projects run agents; suspend to cut them off instantly."
        action={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f} value={f} className="capitalize">
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {orgs.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !orgs.data || orgs.data.orgs.length === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title="No organizations"
          description="Organizations appear here as companies sign up."
        />
      ) : (
        <DataTable
          rows={orgs.data.orgs}
          getRowKey={(o) => o.orgId}
          getRowHref={(o) => `/admin/orgs/${o.orgId}`}
          getRowLabel={(o) => `Open organization ${o.name}`}
          columns={[
            {
              id: "org",
              header: "Organization",
              cell: (o) => (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{o.name}</span>
                  <span className="font-mono text-[11px] text-faint">{o.orgId}</span>
                </div>
              ),
            },
            { id: "status", header: "Status", cell: (o) => <StatusBadge status={o.status as Status} /> },
            { id: "projects", header: "Projects", align: "right", cell: (o) => o.projectCount },
            { id: "members", header: "Members", align: "right", cell: (o) => o.memberCount },
            { id: "email", header: "Billing email", cell: (o) => <span className="text-muted-foreground">{o.billingEmail}</span> },
            {
              id: "actions",
              header: "",
              align: "right",
              interactive: true,
              cell: (o) =>
                o.status !== "approved" ? (
                  <Button
                    size="xs"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(o.orgId, { onSuccess: () => toast.success(`${o.name} approved`), onError })}
                  >
                    Approve
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={suspend.isPending}
                    onClick={() => {
                      if (!window.confirm(`Suspend ${o.name}? Every project in it stops running agents.`)) return;
                      suspend.mutate(o.orgId, { onSuccess: () => toast.success(`${o.name} suspended`), onError });
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

export default function AdminOrgsPage() {
  return (
    <Suspense>
      <OrgsInner />
    </Suspense>
  );
}
