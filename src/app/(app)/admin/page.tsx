"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { useAdminOverview } from "@/features/admin/hooks";
import { compactNumber, percent, usd } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatBand, Widget } from "@/components/ops/primitives";
import { BreakdownRows } from "@/components/charts/breakdown";
import { SegmentTicks, TickMeter } from "@/components/charts/meters";
import { RollingNumber } from "@/components/charts/rolling-number";

/** Parts of a whole on fine ticks, with the numbers beneath. Hovering a row picks out its part. */
function Parts({ rows, format = compactNumber }: { rows: Array<{ key: string; label: string; value: number; color: string; href?: string }>; format?: (v: number) => string }) {
  const [focus, setFocus] = useState<string | null>(null);
  const shown = rows.filter((r) => r.value > 0);
  return (
    <div className="space-y-2">
      <SegmentTicks rows={shown.length ? shown : [{ key: "none", value: 1, color: "var(--border-strong)" }]} active={focus} />
      <BreakdownRows rows={rows} format={format} active={focus} onActive={setFocus} />
    </div>
  );
}

export default function AdminOverviewPage() {
  const overview = useAdminOverview();
  const d = overview.data;

  const queues: Array<{ label: string; count: number | null; href: string }> = [
    { label: "Organizations awaiting approval", count: d ? d.orgs.pending : null, href: "/admin/orgs?status=pending" },
    { label: "Projects awaiting approval", count: d ? d.projects.pending : null, href: "/admin/projects" },
    { label: "Payments awaiting confirmation", count: d ? d.paymentsAwaitingConfirmation : null, href: "/admin/billing" },
  ];
  const lifecycle = (s: { approved: number; pending: number; suspended: number }) => [
    { key: "approved", label: "Approved", value: s.approved, color: "var(--success)" },
    { key: "pending", label: "Pending", value: s.pending, color: "var(--warning)" },
    { key: "suspended", label: "Suspended", value: s.suspended, color: "var(--error)" },
  ];

  return (
    <div className="settle-in space-y-3">
      <PageHeader size="compact" title="Platform overview" description="Revenue, traffic, and the queues that need you." />

      {d ? (
        <StatBand
          stats={[
            { label: "Revenue this month", value: usd(d.revenueThisMonth.billedUsd), sub: "billed, all projects", href: "/admin/billing" },
            { label: "Gain this month", value: usd(d.revenueThisMonth.gainUsd), sub: `on ${usd(d.revenueThisMonth.costUsd)} provider cost` },
            { label: "Runs this month", value: compactNumber(d.revenueThisMonth.runs), href: "/admin/logs" },
            { label: "Runs today", value: compactNumber(d.today.runs), sub: `${d.today.errors} errors`, href: "/admin/logs" },
            {
              label: "Error rate today",
              value: percent(d.today.errorRate),
              tone: d.today.errorRate >= 0.05 ? "warning" : undefined,
              visual: <TickMeter value={d.today.errorRate} tone={d.today.errorRate >= 0.05 ? "warning" : "brand"} height={8} />,
            },
          ]}
        />
      ) : (
        <Skeleton className="h-20 rounded-xl" />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {queues.map((q) => (
          <Link key={q.label} href={q.href} className="tile tile-link group flex items-center justify-between gap-3 p-3.5 outline-none focus-visible:border-brand">
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{q.label}</span>
              {q.count === null ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <span className={`mt-0.5 block text-xl leading-7 font-semibold tracking-tight ${q.count > 0 ? "text-warning" : "text-foreground"}`}>
                  <RollingNumber value={String(q.count)} />
                </span>
              )}
            </span>
            <ArrowRightIcon className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Widget title="Where this month's revenue goes" hint="Billed amount, split into what the model provider charged and what's left.">
          {d ? (
            <Parts
              format={(v) => usd(v)}
              rows={[
                { key: "cost", label: "Provider cost", value: d.revenueThisMonth.costUsd, color: "var(--chart-2)" },
                { key: "gain", label: "Gain", value: d.revenueThisMonth.gainUsd, color: "var(--chart-1)" },
              ]}
            />
          ) : (
            <Skeleton className="h-24" />
          )}
        </Widget>
        <Widget title="Organizations" href="/admin/orgs">
          {d ? <Parts rows={lifecycle(d.orgs)} /> : <Skeleton className="h-24" />}
        </Widget>
        <Widget title="Projects" href="/admin/projects">
          {d ? <Parts rows={lifecycle(d.projects)} /> : <Skeleton className="h-24" />}
        </Widget>
      </div>
    </div>
  );
}
