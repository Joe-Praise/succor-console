"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  StampIcon,
  WebhookIcon,
  WalletIcon,
  CircleDashedIcon,
  WorkflowIcon,
  PlugZapIcon,
  FingerprintIcon,
  IdCardIcon,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";

import { useProjectScope } from "@/features/projects/use-project-scope";
import {
  useProjectSetup,
  useCurrentUsage,
  useUsage,
  useLogs,
  useKeys,
  useCallbacks,
} from "@/features/projects/hooks";
import { useOrgProjects } from "@/features/orgs/hooks";
import { useApprovals } from "@/features/runtime/hooks";
import { useProfile } from "@/features/governance/hooks";
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
  jobId?: string | null;
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
                    {log.jobId ? (
                      <Link
                        href={`/o/${orgId}/p/${projectId}/jobs/${log.jobId}`}
                        className="block truncate font-mono text-xs text-foreground hover:text-brand"
                      >
                        {log.agentType ?? "—"}
                      </Link>
                    ) : (
                      <p className="truncate font-mono text-xs text-foreground">{log.agentType ?? "—"}</p>
                    )}
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

/** Things that need a human, surfaced before anything else. Silent when all clear. */
function AttentionStrip({ orgId, projectId }: { orgId: string; projectId: string }) {
  const approvals = useApprovals(projectId);
  const failed = useCallbacks(projectId, 50, false);
  const usage = useCurrentUsage(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const items: Array<{ href: string; icon: typeof StampIcon; text: string; tone: string }> = [];
  const waiting = approvals.data?.approvals.length ?? 0;
  if (waiting > 0) {
    items.push({
      href: `${base}/approvals`,
      icon: StampIcon,
      text: `${waiting} deliver${waiting === 1 ? "y is" : "ies are"} waiting for approval`,
      tone: "bg-warning-bg text-warning",
    });
  }
  const failedCount = failed.data?.deliveries.length ?? 0;
  if (failedCount > 0) {
    items.push({
      href: `${base}/callbacks`,
      icon: WebhookIcon,
      text: `${failedCount}${failedCount === 50 ? "+" : ""} callback${failedCount === 1 ? "" : "s"} failed to reach your API in the last 30 days`,
      tone: "bg-error-bg text-error",
    });
  }
  const u = usage.data;
  if (u?.monthlyBudgetUsd && u.billedUsd >= u.monthlyBudgetUsd * 0.8) {
    items.push({
      href: `${base}/usage`,
      icon: WalletIcon,
      text: u.budgetExceeded
        ? "Monthly budget reached — agent calls return 402 until it resets"
        : `${Math.round((u.billedUsd / u.monthlyBudgetUsd) * 100)}% of this month's budget used`,
      tone: u.budgetExceeded ? "bg-error-bg text-error" : "bg-warning-bg text-warning",
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <Link
          key={i.href + i.text}
          href={i.href}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition-opacity hover:opacity-90",
            i.tone,
          )}
        >
          <span className="flex items-center gap-2.5">
            <i.icon className="size-4 shrink-0" aria-hidden />
            {i.text}
          </span>
          <ArrowRightIcon className="size-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

/** Go-live checklist, derived entirely from live state — nothing to tick by hand. */
function SetupChecklist({ orgId, projectId }: { orgId: string; projectId: string }) {
  const setup = useProjectSetup(projectId);
  const keys = useKeys(projectId);
  const projects = useOrgProjects(orgId);
  const profile = useProfile(projectId);
  const logs = useLogs(projectId, 5);
  const base = `/o/${orgId}/p/${projectId}`;

  const project = projects.data?.projects.find((p) => p.projectId === projectId);
  const steps = [
    {
      done: setup.data?.status === "approved",
      label: "Project approved",
      hint: "Agents run once the platform approves the project.",
      href: null,
    },
    {
      done: (setup.data?.enabledAgents.length ?? 0) > 0,
      label: "Agents enabled",
      hint: "Browse the catalog and request what you need.",
      href: `${base}/agents`,
    },
    {
      done: !!project?.apiBaseUrls?.some((u) => !!u.url),
      label: "Callback base URL set",
      hint: "Where results are delivered.",
      href: `${base}/settings`,
    },
    {
      done: (keys.data?.keys ?? []).some((k) => !k.revokedAt),
      label: "API key minted",
      hint: "Your backend's credential.",
      href: `${base}/keys`,
    },
    {
      done: !!profile.data?.profile,
      label: "Business profile described",
      hint: "Optional — makes every output sound like you.",
      href: `${base}/profile`,
    },
    {
      done: (logs.data?.length ?? 0) > 0,
      label: "First run completed",
      hint: "Try the playground, or call from your backend.",
      href: `${base}/playground`,
    },
  ];
  const loading =
    setup.isLoading || keys.isLoading || projects.isLoading || profile.isLoading || logs.isLoading;
  const doneCount = steps.filter((s) => s.done).length;
  if (!loading && doneCount === steps.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Go-live checklist</CardTitle>
            <CardDescription>Read from live state — it completes itself as you go.</CardDescription>
          </div>
          <span className="font-mono text-sm text-brand tabular-nums">
            {loading ? "…" : `${doneCount}/${steps.length}`}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => {
              const inner = (
                <>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      s.done ? "bg-success text-white" : "border border-strong text-faint",
                    )}
                  >
                    {s.done ? <CheckIcon className="size-3" /> : <CircleDashedIcon className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        s.done ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    {!s.done ? <span className="block text-xs text-muted-foreground">{s.hint}</span> : null}
                  </span>
                </>
              );
              return (
                <li key={s.label}>
                  {s.href && !s.done ? (
                    <Link
                      href={s.href}
                      className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-strong"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

const PLATFORM_LINKS = [
  { href: "workflows", icon: WorkflowIcon, title: "Workflows", body: "Chain agents into durable, resumable pipelines." },
  { href: "tools", icon: PlugZapIcon, title: "Tools", body: "Let tool-ready agents read your systems over MCP." },
  { href: "profile", icon: IdCardIcon, title: "Profile", body: "One description of your business, read by every prompt." },
  { href: "audit", icon: FingerprintIcon, title: "Audit", body: "Signed record of every approval and privileged action." },
];

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
        description="What needs you, how close you are to live, and what this month has cost."
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

      <AttentionStrip orgId={orgId} projectId={projectId} />
      <SetupChecklist orgId={orgId} projectId={projectId} />

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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">More than single calls</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_LINKS.map((l) => (
            <Link
              key={l.href}
              href={`/o/${orgId}/p/${projectId}/${l.href}`}
              className="group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-strong"
            >
              <l.icon className="size-4 text-brand" aria-hidden />
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-foreground">
                {l.title}
                <ArrowRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.body}</p>
            </Link>
          ))}
        </div>
      </section>

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
