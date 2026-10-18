"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClockIcon, CoinsIcon, RepeatIcon, SendIcon, StampIcon, SigmaIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useExecution, isExecutionLive } from "@/features/executions/hooks";
import { buildTimeline } from "@/features/executions/timeline";
import { diagnose, primaryDelivery } from "@/features/executions/diagnostics";
import { EventList, EventWaterfall, EventInspector } from "@/features/executions/event-views";
import {
  OutputPanel,
  InputPanel,
  CostPanel,
  DeliveryPanel,
  AuditPanel,
  RunIdentifiers,
} from "@/features/executions/run-panels";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { useOrgCtx } from "@/features/orgs/org-context";
import { ORG_ROLE_RANK } from "@/lib/permissions";
import { useUrlFilters } from "@/lib/url-filters";
import { duration, elapsedMs, usdPrecise, tokens } from "@/lib/format";
import { deliveryLabel } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { Callout, KpiCard, StatusTriplet } from "@/components/ops/primitives";

const TABS = ["timeline", "output", "input", "cost", "delivery", "audit"] as const;
type Tab = (typeof TABS)[number];
const URL_KEYS = ["tab", "event"] as const;

const SEVERITY_TONE = { ok: "success", info: "info", warning: "warning", error: "error" } as const;

function RunDetail() {
  const { orgId, projectId } = useProjectScope();
  const { jobId } = useParams<{ jobId: string }>();
  const { role } = useOrgCtx();
  const { nameOf } = useAgentNames(projectId);
  const exec = useExecution(projectId, jobId);
  const { values, set } = useUrlFilters(URL_KEYS);
  const base = `/o/${orgId}/p/${projectId}`;

  const record = exec.data;
  const events = useMemo(() => (record ? buildTimeline(record) : []), [record]);

  const state = renderDetailState({ query: exec, backHref: `${base}/runs`, backLabel: "All runs", noun: "run" });
  if (state || !record) return state ?? <Skeleton className="h-96 w-full rounded-xl" />;

  const { job } = record;
  const tab: Tab = (TABS as readonly string[]).includes(values.tab) ? (values.tab as Tab) : "timeline";
  const selectedKey = events.some((e) => e.key === values.event) ? values.event : (events[events.length - 1]?.key ?? null);
  const selected = events.find((e) => e.key === selectedKey) ?? null;

  const live = isExecutionLive(record);
  const diagnosis = diagnose(record);
  const delivery = primaryDelivery(record);
  const cost = record.usage.reduce((s, r) => s + (r.estimatedCostUsd ?? 0), 0);
  const billed = record.usage.reduce((s, r) => s + (r.billedUsd ?? 0), 0);
  const tok = record.usage.reduce(
    (s, r) => s + (r.inputTokens ?? 0) + (r.outputTokens ?? 0) + (r.embeddingTokens ?? 0),
    0,
  );
  const elapsed = live ? null : elapsedMs(job.createdAt, job.updatedAt);
  const canDecide = ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin;

  const selectEvent = (key: string) => set({ event: key, tab: null });

  return (
    <DetailPage
      breadcrumbs={[{ label: "Runs", href: `${base}/runs` }, { label: job.id.slice(-8) }]}
      eyebrow={`Run · ${job.agentType}`}
      title={nameOf(job.agentType)}
      id={job.id}
      status={<StatusTriplet jobStatus={job.status} runStatus={job.runStatus} delivery={delivery} />}
      actions={
        job.status === "pending_approval" ? (
          <Button size="sm" render={<Link href={`${base}/approvals?job=${job.id}`} />}>
            <StampIcon />
            {canDecide ? "Review & decide" : "View in approvals"}
          </Button>
        ) : null
      }
      aside={<RunIdentifiers record={record} base={base} />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Elapsed"
          icon={ClockIcon}
          value={elapsed === null ? "In progress" : duration(elapsed)}
          sub={live ? "updating live" : "created → last state change"}
          definition="From job creation to the job's last recorded state change. Not a sum of step durations — step start times aren't recorded."
        />
        <KpiCard
          label="Attempts"
          icon={RepeatIcon}
          value={`${job.attempt} / ${job.maxAttempts}`}
          sub={job.reviewedAt ? "reset by approval" : "claims used / budget"}
          definition="Worker claims used out of this agent's run budget. Approval resets the counter so delivery gets a fresh budget."
          tone={job.attempt > 1 ? "warning" : undefined}
        />
        <KpiCard
          label="Cost → billed"
          icon={CoinsIcon}
          value={record.usage.length ? usdPrecise(billed) : "—"}
          sub={record.usage.length ? `provider ${usdPrecise(cost)}` : "not metered yet"}
          definition="Billed = recorded provider cost × your markup, snapshotted per priced row. Tool, infra and delivery costs aren't metered."
        />
        <KpiCard
          label="Tokens"
          icon={SigmaIcon}
          value={record.usage.length ? tokens(tok) : "—"}
          sub="input + output + embedding"
          definition="Sum of tokens on this run's priced rows."
        />
        <KpiCard
          label="Delivery"
          icon={SendIcon}
          value={delivery ? deliveryLabel(delivery) : "None"}
          sub={delivery ? `attempt ${delivery.attempt} of 3` : "no callback recorded"}
          definition="The callback to your API — tracked separately from the run's own outcome."
          tone={delivery?.status === "dead" || delivery?.status === "failed" ? "error" : undefined}
        />
      </div>

      <Callout tone={SEVERITY_TONE[diagnosis.severity]} title={diagnosis.title}>
        <p>{diagnosis.explanation}</p>
        {diagnosis.nextSteps.length ? (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {diagnosis.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : null}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="lg:h-[640px]">
          <EventList events={events} selectedKey={selectedKey} onSelect={selectEvent} />
        </div>
        <div className="min-w-0 space-y-4 rounded-xl border border-border bg-surface p-4">
          <Tabs value={tab} onValueChange={(v) => set({ tab: v === "timeline" ? null : String(v) })}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="cost">Cost</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
              <TabsTrigger value="audit">Audit{record.audit.length ? ` (${record.audit.length})` : ""}</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "timeline" ? (
            <div className="space-y-6">
              <EventWaterfall events={events} selectedKey={selectedKey} onSelect={selectEvent} />
              <div className="border-t border-border pt-4">
                <EventInspector event={selected} record={record} projectId={projectId} base={base} />
              </div>
            </div>
          ) : tab === "output" ? (
            <OutputPanel record={record} />
          ) : tab === "input" ? (
            <InputPanel record={record} />
          ) : tab === "cost" ? (
            <CostPanel record={record} base={base} />
          ) : tab === "delivery" ? (
            <DeliveryPanel record={record} base={base} />
          ) : (
            <AuditPanel record={record} base={base} />
          )}
        </div>
      </div>
    </DetailPage>
  );
}

export default function RunDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RunDetail />
    </Suspense>
  );
}
