"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Billing email</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.data.orgs.map((o) => (
                <TableRow key={o.orgId}>
                  <TableCell>
                    <Link href={`/admin/orgs/${o.orgId}`} className="flex flex-col hover:underline">
                      <span className="font-medium text-foreground">{o.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{o.orgId}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status as Status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.projectCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.memberCount}</TableCell>
                  <TableCell className="text-muted-foreground">{o.billingEmail}</TableCell>
                  <TableCell className="text-right">
                    {o.status !== "approved" ? (
                      <Button
                        size="sm"
                        disabled={approve.isPending}
                        onClick={() =>
                          approve.mutate(o.orgId, {
                            onSuccess: () => toast.success(`${o.name} approved`),
                            onError,
                          })
                        }
                      >
                        Approve
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={suspend.isPending}
                        onClick={() =>
                          suspend.mutate(o.orgId, {
                            onSuccess: () => toast.success(`${o.name} suspended`),
                            onError,
                          })
                        }
                      >
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
