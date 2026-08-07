"use client";

import Link from "next/link";
import { PlusIcon, FolderKanbanIcon } from "lucide-react";

import { useOrgCtx } from "@/features/orgs/org-context";
import { useOrg, useOrgBillingSummary } from "@/features/orgs/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function OrgOverviewPage() {
  const { org, can } = useOrgCtx();
  const detail = useOrg(org.orgId);
  const billing = useOrgBillingSummary(can("org.billing.read") ? org.orgId : "");

  const stats: Array<{ label: string; value: string | null }> = [
    { label: "Projects", value: String(org.projects.length) },
    { label: "Members", value: detail.data ? String(detail.data.memberCount) : null },
    ...(can("org.billing.read")
      ? [
          {
            label: "Spend this month",
            value: billing.data ? usd(billing.data.totalBilledUsd) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={org.name}
        description="Everything your organization runs, in one place."
        action={
          can("project.create") ? (
            <Button size="sm" render={<Link href={`/o/${org.orgId}/projects?new=1`} />}>
              <PlusIcon />
              New project
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
            <CardContent>
              {s.value === null ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-medium tabular-nums text-foreground">{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Projects</h2>
        {org.projects.length === 0 ? (
          <EmptyState
            icon={FolderKanbanIcon}
            title="No projects yet"
            description="Create a project to get API keys and start running agents."
            action={
              can("project.create") ? (
                <Button size="sm" render={<Link href={`/o/${org.orgId}/projects?new=1`} />}>
                  <PlusIcon />
                  Create project
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.projects.map((p) => {
              const spend = billing.data?.byProject.find((b) => b.projectId === p.projectId);
              return (
                <Link key={p.projectId} href={`/o/${org.orgId}/p/${p.projectId}`}>
                  <Card className="h-full transition-colors hover:border-strong">
                    <CardHeader>
                      <CardTitle className="truncate">{p.name}</CardTitle>
                      <CardDescription className="font-mono">{p.projectId}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <StatusBadge
                        status={
                          (["approved", "pending", "suspended"].includes(p.status)
                            ? p.status
                            : "draft") as Status
                        }
                      />
                      {spend ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {usd(spend.billedUsd)} mo
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
