"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, FolderKanbanIcon } from "lucide-react";

import { useOrgCtx } from "@/features/orgs/org-context";
import { useOrg, useOrgBillingSummary } from "@/features/orgs/hooks";
import { useOpsSummary } from "@/features/executions/hooks";
import { successRate, undeliverable } from "@/features/executions/ops";
import { rangeBounds } from "@/lib/time-range";
import { compactNumber, percent, usd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrgBillingSummary } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ops/primitives";

type ProjectSpend = OrgBillingSummary["byProject"][number];

function HealthStat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "error" | "info" }) {
  return (
    <div>
      <p className="text-[11px] text-faint">{label}</p>
      <p
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "error" ? "text-error" : tone === "warning" ? "text-warning" : tone === "info" ? "text-info" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** One project's last-7-day health, from its own ops summary. */
function ProjectHealthCard({
  orgId,
  project,
  spend,
  range,
}: {
  orgId: string;
  project: { projectId: string; name: string; status: string };
  spend: ProjectSpend | undefined;
  range: { from: string; to: string };
}) {
  const summary = useOpsSummary(project.projectId, range);
  const s = summary.data;
  const rate = s ? successRate(s.runs) : null;
  const live = s ? (s.live["queued"] ?? 0) + (s.live["running"] ?? 0) : 0;
  const waiting = s?.live["pending_approval"] ?? 0;
  const lost = s ? undeliverable(s.deliveries) : 0;

  return (
    <Link
      href={`/o/${orgId}/p/${project.projectId}`}
      className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-strong focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{project.name}</p>
          <p className="truncate font-mono text-[11px] text-faint">{project.projectId}</p>
        </div>
        <StatusBadge
          status={(["approved", "pending", "suspended"].includes(project.status) ? project.status : "draft") as Status}
        />
      </div>

      {summary.isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : summary.isError || !s ? (
        <p className="text-xs text-faint">Health unavailable for your role.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <HealthStat
            label="Success 7d"
            value={rate === null ? "—" : percent(rate, 0)}
            tone={rate !== null && rate < 0.9 ? "warning" : undefined}
          />
          <HealthStat label="Runs 7d" value={compactNumber(s.runs.total)} />
          <HealthStat label="Live" value={String(live)} tone={live ? "info" : undefined} />
          <HealthStat
            label={lost ? "Undelivered" : "Approvals"}
            value={String(lost || waiting)}
            tone={lost ? "error" : waiting ? "warning" : undefined}
          />
        </div>
      )}

      {spend ? (
        <div className="mt-auto border-t border-border pt-3">
          <BudgetMeter spent={spend.billedUsd} budget={spend.monthlyBudgetUsd} />
        </div>
      ) : null}
    </Link>
  );
}

export default function OrgOverviewPage() {
  const { org, can } = useOrgCtx();
  const detail = useOrg(org.orgId);
  const canBilling = can("org.billing.read");
  const billing = useOrgBillingSummary(canBilling ? org.orgId : "");
  const [now] = useState(() => Date.now());
  const last7d = rangeBounds("7d", now);
  const totalRuns = billing.data?.byProject.reduce((n, p) => n + p.runs, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        size="compact"
        eyebrow="Organization"
        title={org.name}
        description="Every project's health and spend in one place. Open a project for its runs, approvals and usage."
        action={
          can("project.create") ? (
            <Button size="sm" render={<Link href={`/o/${org.orgId}/projects?new=1`} />}>
              <PlusIcon />
              New project
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Projects" value={String(org.projects.length)} href={`/o/${org.orgId}/projects`} />
        <KpiCard
          label="Members"
          value={detail.data ? String(detail.data.memberCount) : "—"}
          loading={detail.isLoading}
          href={`/o/${org.orgId}/team`}
        />
        {canBilling ? (
          <>
            <KpiCard
              label="Billed this month"
              value={billing.data ? usd(billing.data.totalBilledUsd) : "—"}
              sub={billing.data ? `${billing.data.month} · all projects` : undefined}
              loading={billing.isLoading}
              href={`/o/${org.orgId}/billing`}
            />
            <KpiCard
              label="Runs this month"
              value={totalRuns === undefined ? "—" : compactNumber(totalRuns)}
              sub="priced runs, all projects"
              loading={billing.isLoading}
            />
          </>
        ) : null}
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
            {org.projects.map((p) => (
              <ProjectHealthCard
                key={p.projectId}
                orgId={org.orgId}
                project={p}
                spend={billing.data?.byProject.find((b) => b.projectId === p.projectId)}
                range={last7d}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
