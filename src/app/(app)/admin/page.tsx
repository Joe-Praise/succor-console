"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { useAdminOverview } from "@/features/admin/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminOverviewPage() {
  const overview = useAdminOverview();
  const d = overview.data;

  const kpis: Array<{ label: string; value: string | null; sub?: string }> = [
    {
      label: "Revenue this month",
      value: d ? usd(d.revenueThisMonth.billedUsd) : null,
      sub: d ? `${usd(d.revenueThisMonth.gainUsd)} gain on ${usd(d.revenueThisMonth.costUsd)} cost` : undefined,
    },
    { label: "Runs this month", value: d ? String(d.revenueThisMonth.runs) : null },
    {
      label: "Runs today",
      value: d ? String(d.today.runs) : null,
      sub: d ? `${d.today.errors} errors (${(d.today.errorRate * 100).toFixed(1)}%)` : undefined,
    },
  ];

  const queues: Array<{ label: string; count: number | null; href: string }> = [
    { label: "Organizations awaiting approval", count: d ? d.orgs.pending : null, href: "/admin/orgs?status=pending" },
    { label: "Projects awaiting approval", count: d ? d.projects.pending : null, href: "/admin/projects" },
    { label: "Payments awaiting confirmation", count: d ? d.paymentsAwaitingConfirmation : null, href: "/admin/billing" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Platform overview" description="Revenue, traffic, and the queues that need you." />

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
            </CardHeader>
            <CardContent>
              {k.value === null ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-medium tabular-nums text-foreground">{k.value}</p>
                  {k.sub ? <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p> : null}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Queues</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {queues.map((q) => (
            <Card key={q.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{q.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                {q.count === null ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <p className="text-2xl font-medium tabular-nums text-foreground">{q.count}</p>
                )}
                <Button variant="ghost" size="sm" render={<Link href={q.href} />}>
                  Review
                  <ArrowRightIcon />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organizations</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-6 text-sm">
            {d ? (
              <>
                <span><span className="font-medium tabular-nums text-foreground">{d.orgs.approved}</span> approved</span>
                <span><span className="font-medium tabular-nums text-warning">{d.orgs.pending}</span> pending</span>
                <span><span className="font-medium tabular-nums text-error">{d.orgs.suspended}</span> suspended</span>
              </>
            ) : (
              <Skeleton className="h-6 w-48" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projects</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-6 text-sm">
            {d ? (
              <>
                <span><span className="font-medium tabular-nums text-foreground">{d.projects.approved}</span> approved</span>
                <span><span className="font-medium tabular-nums text-warning">{d.projects.pending}</span> pending</span>
                <span><span className="font-medium tabular-nums text-error">{d.projects.suspended}</span> suspended</span>
              </>
            ) : (
              <Skeleton className="h-6 w-48" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
