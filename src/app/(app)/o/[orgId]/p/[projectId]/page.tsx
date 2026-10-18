"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  StampIcon,
  WebhookIcon,
  WalletIcon,
  WorkflowIcon,
  PlugZapIcon,
  FingerprintIcon,
  IdCardIcon,
  ActivityIcon,
  GaugeIcon,
  TimerIcon,
  SkullIcon,
  CircleHelpIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useProjectSetup, useCurrentUsage, useKeys } from "@/features/projects/hooks";
import { useOrgProjects } from "@/features/orgs/hooks";
import { useProfile } from "@/features/governance/hooks";
import { useRuns, useOpsSummary } from "@/features/executions/hooks";
import { fillDaily, jobSlices, successRate, undeliverable } from "@/features/executions/ops";
import { runColumns } from "@/features/executions/run-columns";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { useUrlFilters } from "@/lib/url-filters";
import { isRangeKey, rangeBounds, previousBounds, type RangeKey } from "@/lib/time-range";
import { cn } from "@/lib/utils";
import { compactNumber, delta, duration, percent, relativeTime, shortId, usd } from "@/lib/format";
import type { OpsSummary } from "@/types";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/code-block";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ops/data-table";
import { KpiCard, Section, ToneDot } from "@/components/ops/primitives";
import { StackedBars, Donut, LegendTable } from "@/components/ops/charts";
import { FilterBar, TimeRangeTabs } from "@/components/ops/filters";

const URL_KEYS = ["range"] as const;

/** Go-live checklist, derived entirely from live state. Disappears once complete. */
function SetupChecklist({ orgId, projectId, hasRuns }: { orgId: string; projectId: string; hasRuns: boolean | null }) {
  const setup = useProjectSetup(projectId);
  const keys = useKeys(projectId);
  const projects = useOrgProjects(orgId);
  const profile = useProfile(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const project = projects.data?.projects.find((p) => p.projectId === projectId);
  const steps = [
    { done: setup.data?.status === "approved", label: "Project approved", hint: "Agents run once the platform approves the project.", href: null },
    { done: (setup.data?.enabledAgents.length ?? 0) > 0, label: "Agents enabled", hint: "Browse the catalog and request what you need.", href: `${base}/agents` },
    { done: !!project?.apiBaseUrls?.some((u) => !!u.url), label: "Callback base URL set", hint: "Where results are delivered.", href: `${base}/settings` },
    { done: (keys.data?.keys ?? []).some((k) => !k.revokedAt), label: "API key minted", hint: "Your backend's credential.", href: `${base}/keys` },
    { done: !!profile.data?.profile, label: "Business profile described", hint: "Optional — makes every output sound like you.", href: `${base}/profile` },
    { done: !!hasRuns, label: "First run completed", hint: "Try the playground, or call from your backend.", href: `${base}/playground` },
  ];
  const loading = setup.isLoading || keys.isLoading || projects.isLoading || profile.isLoading || hasRuns === null;
  const doneCount = steps.filter((s) => s.done).length;
  if (loading || doneCount === steps.length) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Go-live checklist</p>
          <p className="text-xs text-muted-foreground">Read from live state — it completes itself, then disappears.</p>
        </div>
        <span className="font-mono text-sm tabular-nums text-brand">
          {doneCount}/{steps.length}
        </span>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                <span className={cn("block text-sm font-medium", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {s.label}
                </span>
                {!s.done ? <span className="block text-xs text-muted-foreground">{s.hint}</span> : null}
              </span>
            </>
          );
          return (
            <li key={s.label}>
              {s.href && !s.done ? (
                <Link href={s.href} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-strong">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface AttentionItem {
  key: string;
  icon: LucideIcon;
  tone: "warning" | "error" | "info";
  text: React.ReactNode;
  href?: string;
}

const ATTENTION_TONE = {
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

/** Everything that needs a human, from the summary — silent when all clear. */
function NeedsAttention({ summary, base, range }: { summary: OpsSummary; base: string; range: RangeKey }) {
  const { projectId } = useProjectScope();
  const usage = useCurrentUsage(projectId);
  const items: AttentionItem[] = [];
  const waiting = summary.live["pending_approval"] ?? 0;
  if (waiting)
    items.push({
      key: "approvals",
      icon: StampIcon,
      tone: "warning",
      href: `${base}/approvals`,
      text: `${waiting} deliver${waiting === 1 ? "y is" : "ies are"} waiting for approval`,
    });
  const dead = summary.jobs["dead"] ?? 0;
  if (dead)
    items.push({
      key: "dead",
      icon: SkullIcon,
      tone: "error",
      href: `${base}/runs?status=dead&range=${range}`,
      text: `${dead} run${dead === 1 ? "" : "s"} dead-lettered after exhausting retries`,
    });
  const lost = undeliverable(summary.deliveries);
  if (lost)
    items.push({
      key: "deliveries",
      icon: WebhookIcon,
      tone: "error",
      href: `${base}/callbacks?result=failed`,
      text: `${lost} callback${lost === 1 ? "" : "s"} will not reach your API without intervention`,
    });
  if (summary.deliveries.outcomeUnknown)
    items.push({
      key: "unknown",
      icon: CircleHelpIcon,
      tone: "info",
      text: (
        <>
          {summary.deliveries.outcomeUnknown} deliver{summary.deliveries.outcomeUnknown === 1 ? "y" : "ies"} may have
          arrived before timing out — your receiver must dedupe on <span className="font-mono">X-Delivery-Id</span>
        </>
      ),
    });
  if (summary.runs.failed)
    items.push({
      key: "failed-runs",
      icon: TriangleAlertIcon,
      tone: "warning",
      href: `${base}/logs`,
      text: `${summary.runs.failed} priced run${summary.runs.failed === 1 ? "" : "s"} ended in error, validation failure or rate limiting`,
    });
  const u = usage.data;
  if (u?.monthlyBudgetUsd && u.billedUsd >= u.monthlyBudgetUsd * 0.8)
    items.push({
      key: "budget",
      icon: WalletIcon,
      tone: u.budgetExceeded ? "error" : "warning",
      href: `${base}/usage`,
      text: u.budgetExceeded
        ? "Monthly budget reached — agent calls return 402 until it resets"
        : `${Math.round((u.billedUsd / u.monthlyBudgetUsd) * 100)}% of this month's budget used`,
    });

  return (
    <div className="rounded-xl border border-border bg-surface">
      <p className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Needs attention</p>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <CircleCheckIcon className="size-4 text-success" aria-hidden />
          Nothing needs you in the last {range}.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((i) => {
            const body = (
              <>
                <i.icon className={cn("mt-0.5 size-4 shrink-0", ATTENTION_TONE[i.tone])} aria-hidden />
                <span className="min-w-0 flex-1 text-sm text-foreground">{i.text}</span>
                {i.href ? <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden /> : null}
              </>
            );
            return (
              <li key={i.key}>
                {i.href ? (
                  <Link href={i.href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Jobs the worker owns right now — polls via useRuns while any are live. */
function RunningNow({ base }: { base: string }) {
  const { projectId } = useProjectScope();
  const { nameOf } = useAgentNames(projectId);
  const live = useRuns(projectId, { status: "queued,running", limit: 6 });
  const rows = live.data?.pages[0]?.jobs ?? [];
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Running now</p>
        <Link href={`${base}/runs?status=queued%2Crunning`} className="text-xs text-brand hover:underline">
          All live →
        </Link>
      </div>
      {live.isLoading ? (
        <Skeleton className="m-4 h-16" />
      ) : live.isError ? (
        <p className="px-4 py-4 text-sm text-error">Couldn&apos;t load live runs.</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">The worker is idle.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`${base}/runs/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-raised">
                <ToneDot tone={r.status === "running" ? "info" : "neutral"} className={r.status === "running" ? "animate-pulse" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{nameOf(r.agentType)}</span>
                  <span className="font-mono text-[11px] text-faint">{shortId(r.id)}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.status} · {relativeTime(r.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PLATFORM_LINKS = [
  { href: "workflows", icon: WorkflowIcon, title: "Workflows", body: "Chain agents into durable, resumable pipelines." },
  { href: "tools", icon: PlugZapIcon, title: "Tools", body: "Let tool-ready agents read your systems over MCP." },
  { href: "profile", icon: IdCardIcon, title: "Profile", body: "One description of your business, read by every prompt." },
  { href: "audit", icon: FingerprintIcon, title: "Audit", body: "Signed record of every approval and privileged action." },
];

function Overview() {
  const { orgId, projectId, project } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const { nameOf } = useAgentNames(projectId);
  const range: RangeKey = isRangeKey(values.range) ? values.range : "7d";
  const [now, setNow] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);
  const prev = previousBounds(bounds);
  const base = `/o/${orgId}/p/${projectId}`;

  const setup = useProjectSetup(projectId);
  const usage = useCurrentUsage(projectId);
  const summary = useOpsSummary(projectId, { from: bounds.from, to: bounds.to });
  const prevSummary = useOpsSummary(projectId, { from: prev.from, to: prev.to });
  const recent = useRuns(projectId, { limit: 8 });
  const recentRows = recent.data?.pages[0]?.jobs ?? [];

  const s = summary.data;
  const p = prevSummary.data;
  const rate = s ? successRate(s.runs) : null;
  const prevRate = p ? successRate(p.runs) : null;
  const days = s ? fillDaily(s.daily, s.from, s.to) : [];
  const slices = s ? jobSlices(s.jobs) : [];
  const jobsTotal = slices.reduce((n, x) => n + x.value, 0);
  const liveNow = s ? (s.live["queued"] ?? 0) + (s.live["running"] ?? 0) : 0;
  const loading = summary.isLoading;
  const budget = usage.data?.monthlyBudgetUsd ?? null;
  const budgetPct = budget && usage.data ? usage.data.billedUsd / budget : null;

  const envBlock = setup.data
    ? Object.entries(setup.data.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        size="compact"
        eyebrow="Overview"
        title={project?.name ?? projectId}
        description="How this project is running: outcomes, live work, what needs you, and what it costs."
        action={
          setup.data ? (
            <StatusBadge
              status={(["approved", "pending", "suspended"].includes(setup.data.status) ? setup.data.status : "draft") as Status}
            />
          ) : undefined
        }
      />

      <SetupChecklist orgId={orgId} projectId={projectId} hasRuns={recent.data ? recentRows.length > 0 : null} />

      <FilterBar
        onRefresh={() => {
          setNow(Date.now());
          void summary.refetch();
          void recent.refetch();
        }}
        refreshing={summary.isFetching}
      >
        <TimeRangeTabs value={range} onChange={(v) => set({ range: v === "7d" ? null : v })} />
        {s?.runs.truncated ? (
          <span className="text-xs text-warning">Rates and durations use the most recent 10,000 priced runs in this window.</span>
        ) : null}
      </FilterBar>

      {summary.isError ? (
        <QueryError message="Couldn't load the operations summary." onRetry={() => void summary.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="Success rate"
            icon={GaugeIcon}
            value={rate === null ? "—" : percent(rate)}
            delta={rate !== null && prevRate !== null ? delta(rate, prevRate) : null}
            goodWhen="up"
            sub={s ? `${compactNumber(s.runs.succeeded)} of ${compactNumber(s.runs.total)} runs` : undefined}
            loading={loading}
            unavailable={!loading && rate === null ? "No runs in this window" : null}
            definition="Priced runs whose agent returned success, out of all priced runs recorded in the window."
          />
          <KpiCard
            label="Runs"
            icon={ActivityIcon}
            value={s ? compactNumber(s.runs.total) : "—"}
            delta={s && p && p.runs.total ? delta(s.runs.total, p.runs.total) : null}
            sub={`last ${range}`}
            href={`${base}/runs?range=${range}`}
            loading={loading}
            definition="Priced runs recorded in the window (one usage record each)."
          />
          <KpiCard
            label="Live now"
            icon={ActivityIcon}
            value={compactNumber(liveNow)}
            sub="queued + running"
            tone={liveNow ? "info" : undefined}
            href={`${base}/runs?status=queued%2Crunning`}
            loading={loading}
            definition="Jobs the worker owns at this moment — not bounded by the time range."
          />
          <KpiCard
            label="Awaiting approval"
            icon={StampIcon}
            value={s ? compactNumber(s.live["pending_approval"] ?? 0) : "—"}
            sub="held deliveries"
            tone={s?.live["pending_approval"] ? "warning" : undefined}
            href={`${base}/approvals`}
            loading={loading}
          />
          <KpiCard
            label="Undeliverable"
            icon={WebhookIcon}
            value={s ? compactNumber(undeliverable(s.deliveries)) : "—"}
            sub={s?.deliveries.outcomeUnknown ? `${s.deliveries.outcomeUnknown} outcome unknown` : "dead or failed callbacks"}
            tone={s && undeliverable(s.deliveries) ? "error" : undefined}
            href={`${base}/callbacks?result=failed`}
            loading={loading}
            definition="Callback deliveries created in the window that ended dead (retries exhausted) or failed (permanent, e.g. a 4xx). Scheduled retries aren't counted."
          />
          <KpiCard
            label="p95 duration"
            icon={TimerIcon}
            value={duration(s?.durationMs.p95)}
            sub={s?.durationMs.p50 != null ? `p50 ${duration(s.durationMs.p50)}` : undefined}
            delta={s?.durationMs.p95 != null && p?.durationMs.p95 != null ? delta(s.durationMs.p95, p.durationMs.p95) : null}
            goodWhen="down"
            loading={loading}
            unavailable={!loading && s?.durationMs.p95 == null ? "No recorded durations" : null}
            definition="Agent execution time recorded on each priced run. Excludes queue wait and callback delivery."
          />
          <KpiCard
            label="Budget used"
            icon={WalletIcon}
            value={budgetPct === null ? "—" : percent(budgetPct, 0)}
            sub={budget ? `${usd(usage.data?.billedUsd)} of ${usd(budget)}` : "no cap set"}
            tone={budgetPct !== null && budgetPct >= 0.8 ? "warning" : undefined}
            href={`${base}/usage`}
            loading={usage.isLoading}
            unavailable={!usage.isLoading && !budget ? "No monthly cap set" : null}
            definition="This UTC month's billed usage against the project's cap."
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Runs per day</p>
            <p className="text-xs text-faint">by outcome · line = average duration · UTC days</p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-56" />
          ) : days.every((d) => d.succeeded + d.failed + d.other === 0) ? (
            <p className="py-20 text-center text-sm text-faint">No priced runs in this window.</p>
          ) : (
            <StackedBars
              className="mt-3"
              height={224}
              data={days.map((d) => ({ ...d }))}
              xKey="label"
              series={[
                { key: "succeeded", label: "Succeeded", color: "var(--success)" },
                { key: "failed", label: "Failed", color: "var(--error)" },
                { key: "other", label: "Other (skipped)", color: "var(--text-tertiary)" },
              ]}
              valueFormatter={(v) => compactNumber(v)}
              line={{ key: "avgDurationMs", label: "Avg duration", formatter: (v) => duration(v) }}
            />
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Jobs by status</p>
            <p className="text-xs text-faint">created in window</p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-56" />
          ) : jobsTotal === 0 ? (
            <p className="py-20 text-center text-sm text-faint">No jobs created in this window.</p>
          ) : (
            <div className="mt-3 space-y-4">
              <Donut data={slices} total={compactNumber(jobsTotal)} centerLabel="jobs" />
              <LegendTable
                rows={slices.map((x) => ({ ...x, href: `${base}/runs?status=${x.key}&range=${range}` }))}
                formatter={(v) => compactNumber(v)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section
          title="Recent runs"
          description="Newest first. Job status, agent outcome and delivery are separate columns on purpose."
          actions={
            <Link href={`${base}/runs`} className="text-xs text-brand hover:underline">
              Runs explorer →
            </Link>
          }
        >
          <DataTable
            rows={recentRows}
            getRowKey={(r) => r.id}
            getRowHref={(r) => `${base}/runs/${r.id}`}
            getRowLabel={(r) => `Open run ${r.id} (${nameOf(r.agentType)})`}
            loading={recent.isLoading}
            error={recent.isError ? { message: "Couldn't load recent runs.", onRetry: () => void recent.refetch() } : null}
            empty={
              <EmptyState
                icon={ActivityIcon}
                title="No runs yet"
                description="Run an agent from the playground or your backend and it shows up here."
              />
            }
            columns={runColumns(nameOf, ["status", "run", "outcome", "delivery", "created", "billed"])}
          />
        </Section>
        <div className="space-y-4">
          {s ? <NeedsAttention summary={s} base={base} range={range} /> : <Skeleton className="h-40 rounded-xl" />}
          <RunningNow base={base} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">More than single calls</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_LINKS.map((l) => (
            <Link
              key={l.href}
              href={`${base}/${l.href}`}
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

      <Section
        title="Connect your app"
        description="Drop these into your backend to start calling agents."
        actions={
          <Link href={`${base}/docs`} className="text-xs text-brand hover:underline">
            Full integration guide →
          </Link>
        }
      >
        {setup.isLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : setup.isError ? (
          <QueryError message="Couldn't load setup." onRetry={() => void setup.refetch()} />
        ) : (
          <CodeBlock label=".env" code={envBlock} />
        )}
      </Section>
    </div>
  );
}

export default function ProjectOverviewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Overview />
    </Suspense>
  );
}
