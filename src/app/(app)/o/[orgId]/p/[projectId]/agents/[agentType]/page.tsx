"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FlaskConicalIcon, BookOpenIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog, useUsage } from "@/features/projects/hooks";
import { useRuns } from "@/features/executions/hooks";
import { CapabilityBadges, POLICY_META } from "@/features/agents/capability-badges";
import { AGENT_TRAITS, TRAIT_META } from "@/data/agent-traits";
import { parseEndpoint } from "@/lib/catalog";
import { usd, usdPrecise, relativeTime, duration, elapsedMs } from "@/lib/format";
import { LIVE_JOB_STATUSES } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { CodeBlock } from "@/components/code-block";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { DeliveryBadge, KpiCard, Section } from "@/components/ops/primitives";

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default function AgentPage() {
  const { orgId, projectId } = useProjectScope();
  const { agentType } = useParams<{ agentType: string }>();
  const catalog = useCatalog(projectId);
  const runs = useRuns(projectId, { agentType, limit: 10 });
  const usage = useUsage(projectId, { granularity: "month", groupBy: "agent", from: monthStartIso() });
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: catalog, backHref: `${base}/agents`, backLabel: "All agents", noun: "agent" });
  if (state) return state;
  const e = catalog.data?.catalog.find((x) => x.agentType === agentType);
  if (!e) return <DetailNotFound backHref={`${base}/agents`} backLabel="All agents" noun="agent" />;

  const { method, path } = parseEndpoint(e.endpoint);
  const month = (usage.data?.buckets ?? []).filter((b) => b.agentType === agentType);
  const monthRuns = month.reduce((s, b) => s + b.runs, 0);
  const monthBilled = month.reduce((s, b) => s + b.billedUsd, 0);
  const monthCost = month.reduce((s, b) => s + b.costUsd, 0);
  const recent = runs.data?.pages[0]?.jobs ?? [];
  const policies = [
    e.riskTier === "high" ? "approval" : null,
    e.dataClass === "protected" ? "protected" : null,
    e.toolsEnabled ? "tools" : null,
  ].filter(Boolean) as Array<keyof typeof POLICY_META>;
  const traits = AGENT_TRAITS[e.agentType] ?? [];

  return (
    <DetailPage
      breadcrumbs={[{ label: "Agents", href: `${base}/agents` }, { label: e.name }]}
      eyebrow={`Agent · ${e.category}`}
      title={e.name}
      id={e.agentType}
      status={
        <div className="flex flex-wrap items-center gap-2">
          {e.enabledForProject ? (
            <Badge className="bg-success-bg text-success">Enabled on this project</Badge>
          ) : (
            <Badge variant="secondary">Not enabled</Badge>
          )}
          <CapabilityBadges entry={e} />
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" render={<Link href={`${base}/docs`} />}>
            <BookOpenIcon />
            Integration guide
          </Button>
          {e.enabledForProject ? (
            <Button size="sm" render={<Link href={`${base}/playground?agent=${e.agentType}`} />}>
              <FlaskConicalIcon />
              Try in playground
            </Button>
          ) : null}
        </>
      }
      facts={[
        { label: "Endpoint", value: <span className="font-mono text-xs">{method} {path}</span> },
        { label: "Delivers", value: <span className="font-mono text-xs">{e.callbackMethod} {e.callbackPath}</span> },
        { label: "Model", value: <span className="font-mono text-xs">{e.model ?? "platform default"}</span> },
        { label: "Output budget", value: `${(e.maxTokens ?? e.typicalMaxTokens).toLocaleString()} tokens` },
      ]}
    >
      <p className="max-w-3xl text-sm text-muted-foreground">{e.description}</p>

      {!e.enabledForProject ? (
        <p className="rounded-xl border border-dashed border-strong px-4 py-3 text-sm text-muted-foreground">
          This agent isn&apos;t enabled on this project yet — calls return 403. Ask your platform admin to enable it, or{" "}
          <Link href={`${base}/agents`} className="text-brand hover:underline">
            request it from the catalog
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Runs this month" value={monthRuns.toLocaleString()} sub="UTC month to date" loading={usage.isLoading} />
        <KpiCard label="Billed this month" value={usd(monthBilled)} sub={`provider ${usdPrecise(monthCost)}`} loading={usage.isLoading} />
        <KpiCard
          label="Avg billed per run"
          value={monthRuns ? usdPrecise(monthBilled / monthRuns) : "—"}
          sub="this month"
          loading={usage.isLoading}
        />
      </div>

      {policies.length || traits.length ? (
        <Section title="How it runs">
          <div className="grid gap-3 sm:grid-cols-2">
            {policies.map((p) => {
              const { icon: Icon, label, hint } = POLICY_META[p];
              return (
                <div key={p} className="flex gap-3 tile p-4">
                  <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                </div>
              );
            })}
            {traits.map((t) => (
              <div key={t} className="tile p-4">
                <p className="text-sm font-medium text-foreground">{TRAIT_META[t].label}</p>
                <p className="text-xs text-muted-foreground">{TRAIT_META[t].hint}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Contract" description="What you send, and what this agent sends back to your API.">
        <div className="grid gap-4 xl:grid-cols-2">
          <CodeBlock label={`${method} ${path}`} code={pretty(e.requestExample)} />
          <CodeBlock label={`${e.callbackMethod} <your base URL>${e.callbackPath}`} code={pretty(e.callbackExample)} />
        </div>
      </Section>

      <Section
        title="Recent runs"
        actions={
          <Link href={`${base}/runs?agent=${e.agentType}`} className="text-xs text-brand hover:underline">
            All runs of this agent →
          </Link>
        }
      >
        <DataTable
          rows={recent}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `${base}/runs/${r.id}`}
          getRowLabel={(r) => `Open run ${r.id}`}
          loading={runs.isLoading}
          error={runs.isError ? { message: "Couldn't load runs.", onRetry: () => void runs.refetch() } : null}
          empty={<p className="text-sm text-muted-foreground">This agent hasn&apos;t run on this project yet.</p>}
          columns={[
            { id: "status", header: "Status", cell: (r) => <AnyStatusBadge value={r.status} /> },
            { id: "outcome", header: "Outcome", cell: (r) => (r.runStatus ? <AnyStatusBadge value={r.runStatus} /> : "—") },
            { id: "delivery", header: "Delivery", cell: (r) => (r.delivery ? <DeliveryBadge delivery={r.delivery} /> : "—") },
            { id: "created", header: "Created", cell: (r) => <span className="text-muted-foreground">{relativeTime(r.createdAt)}</span> },
            {
              id: "elapsed",
              header: "Elapsed",
              align: "right",
              cell: (r) => (LIVE_JOB_STATUSES.has(r.status) ? "in progress" : duration(elapsedMs(r.createdAt, r.updatedAt))),
            },
            { id: "billed", header: "Billed", align: "right", cell: (r) => (r.cost ? usdPrecise(r.cost.billedUsd) : "—") },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
