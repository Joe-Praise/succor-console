"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useProjectSetup, useCurrentUsage, useUsage, useLogs } from "@/features/projects/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/code-block";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { StatusBadge, type Status } from "@/components/ui/status-badge";

const ERROR_STATUSES = new Set(["error", "rate_limited", "validation_failed"]);

interface LogRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  status?: string;
  billedUsd?: number | null;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth() {
  const d = new Date();
  return fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

/** Supplementary month-to-date spend trend. Silently absent on error/empty. */
function SpendSparkline({ projectId }: { projectId: string }) {
  const series = useUsage(projectId, { granularity: "day", from: startOfMonth(), to: fmt(new Date()) });
  if (series.isLoading) return <Skeleton className="h-12 w-full" />;
  if (series.isError || !series.data || series.data.buckets.length === 0) return null;
  const data = series.data.buckets.map((b) => ({ v: Number(b.billedUsd.toFixed(4)) }));
  return (
    <div className="h-12" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={[0, "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--chart-1)"
            strokeWidth={1.5}
            fill="var(--chart-1)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecentRuns({ orgId, projectId }: { orgId: string; projectId: string }) {
  const logs = useLogs(projectId, 5);
  const rows = (logs.data ?? []) as LogRow[];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>The latest agent activity on this project.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/o/${orgId}/p/${projectId}/logs`}>View all</Link>}
          />
        </div>
      </CardHeader>
      <CardContent>
        {logs.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : logs.isError ? (
          <QueryError message="Couldn't load recent runs." onRetry={() => void logs.refetch()} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((log, i) => {
              const isError = ERROR_STATUSES.has(log.status ?? "");
              return (
                <li key={log._id ?? i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">
                      {log.agentType ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.ts ? new Date(log.ts).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn("text-xs", isError ? "text-error" : "text-success")}>
                      {log.status ?? "—"}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {log.billedUsd != null ? usd(log.billedUsd) : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectOverviewPage() {
  const { orgId, projectId, project } = useProjectScope();
  const setup = useProjectSetup(projectId);
  const usage = useCurrentUsage(projectId);

  const envBlock = setup.data
    ? Object.entries(setup.data.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";

  return (
    <div className="space-y-8">
      <PageHeader
        title={project?.name ?? projectId}
        description="Connection details, this month's spend, and what's enabled."
        action={
          setup.data ? (
            <StatusBadge
              status={
                (["approved", "pending", "suspended"].includes(setup.data.status)
                  ? setup.data.status
                  : "draft") as Status
              }
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend this month</CardTitle>
            <CardDescription>Billed usage against the project&apos;s budget cap.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : usage.isError ? (
              <QueryError message="Couldn't load spend." onRetry={() => void usage.refetch()} />
            ) : usage.data ? (
              <div className="space-y-3">
                <BudgetMeter spent={usage.data.billedUsd} budget={usage.data.monthlyBudgetUsd} />
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    <span className="font-medium tabular-nums text-foreground">
                      {usage.data.runs}
                    </span>{" "}
                    runs
                  </span>
                  <span>
                    <span className="font-medium tabular-nums text-foreground">
                      {(usage.data.inputTokens + usage.data.outputTokens).toLocaleString()}
                    </span>{" "}
                    tokens
                  </span>
                </div>
                <SpendSparkline projectId={projectId} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enabled agents</CardTitle>
            <CardDescription>What this project can run right now.</CardDescription>
          </CardHeader>
          <CardContent>
            {setup.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : setup.isError ? (
              <QueryError message="Couldn't load setup." onRetry={() => void setup.refetch()} />
            ) : setup.data ? (
              <div className="space-y-3">
                <p className="text-2xl font-medium tabular-nums text-foreground">
                  {setup.data.enabledAgents.length}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/o/${orgId}/p/${projectId}/agents`}>Browse the catalog</Link>}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <RecentRuns orgId={orgId} projectId={projectId} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Connect your app</CardTitle>
              <CardDescription>
                Drop these into your backend to start calling agents.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/o/${orgId}/p/${projectId}/docs`}>
                  Full integration guide
                  <ArrowRightIcon />
                </Link>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {setup.isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : setup.isError ? (
            <QueryError message="Couldn't load setup." onRetry={() => void setup.refetch()} />
          ) : (
            <CodeBlock label=".env" code={envBlock} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
