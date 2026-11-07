"use client";

import { useMemo } from "react";

import { useCallbacks, useCatalog, useCurrentUsage, useKeys, useProjectSetup, useUsage } from "@/features/projects/hooks";
import { useOrgProjects } from "@/features/orgs/hooks";
import { useApprovals, useWorkflows } from "@/features/runtime/hooks";
import { useMcpServers, useToolGrants } from "@/features/tools/hooks";
import { useOpsSummary, useRuns } from "@/features/executions/hooks";
import { undeliverable } from "@/features/executions/ops";
import { isoDay, type Bounds } from "@/lib/time-range";
import { LIVE_JOB_STATUSES } from "@/lib/status";
import type { CallbackDelivery, CatalogEntry, RunRow } from "@/types";
import { buildCanvasGraph, type CanvasGraph } from "@/features/canvas/graph";

export interface AgentStat {
  live: number;
  lastRun: RunRow | null;
  runs: number;
  billedUsd: number;
  /** Runs per UTC day across the window, oldest first. */
  spark: number[];
}

export interface EndpointStat {
  label: string;
  url: string;
  attempts: number;
  ok: number;
  last: CallbackDelivery | null;
}

const EMPTY_STAT: AgentStat = { live: 0, lastRun: null, runs: 0, billedUsd: 0, spark: [] };

/** Failing means the last few attempts mostly didn't land, not "one 500 last week". */
export function isEndpointFailing(attempts: CallbackDelivery[]): boolean {
  const recent = attempts.slice(0, 5);
  if (recent.length === 0) return false;
  return recent.filter((d) => !d.ok).length / recent.length >= 0.5;
}

/** Every number on the canvas, from real endpoints. A query that fails leaves its tile quiet. */
export function useCanvasData(orgId: string, projectId: string, bounds: Bounds) {
  const setup = useProjectSetup(projectId);
  const catalog = useCatalog(projectId);
  const keys = useKeys(projectId);
  const projects = useOrgProjects(orgId);
  const usageNow = useCurrentUsage(projectId);
  const summary = useOpsSummary(projectId, { from: bounds.from, to: bounds.to });
  const approvals = useApprovals(projectId);
  const workflows = useWorkflows(projectId);
  const servers = useMcpServers(projectId);
  const grants = useToolGrants(projectId);
  const callbacks = useCallbacks(projectId, 50);
  const runs = useRuns(projectId, { limit: 100 });
  const usageByAgent = useUsage(projectId, {
    granularity: "day",
    groupBy: "agent",
    from: isoDay(bounds.from),
    to: isoDay(bounds.to),
  });

  const project = projects.data?.projects.find((p) => p.projectId === projectId) ?? null;
  const agents: CatalogEntry[] = useMemo(
    () => (catalog.data?.catalog ?? []).filter((e) => e.enabledForProject),
    [catalog.data],
  );
  const recentRuns = useMemo(() => runs.data?.pages[0]?.jobs ?? [], [runs.data]);

  const agentStats = useMemo(() => {
    const m = new Map<string, AgentStat>();
    const get = (a: string) => {
      const cur = m.get(a) ?? { ...EMPTY_STAT, spark: [] };
      m.set(a, cur);
      return cur;
    };
    for (const r of recentRuns) {
      const s = get(r.agentType);
      if (LIVE_JOB_STATUSES.has(r.status)) s.live += 1;
      // Newest first: the first terminal-or-parked run is what the tile reports.
      if (!s.lastRun && !LIVE_JOB_STATUSES.has(r.status)) s.lastRun = r;
    }
    const days = [...new Set((usageByAgent.data?.buckets ?? []).map((b) => b.period))].sort();
    for (const b of usageByAgent.data?.buckets ?? []) {
      if (!b.agentType) continue;
      const s = get(b.agentType);
      s.runs += b.runs;
      s.billedUsd += b.billedUsd;
      if (s.spark.length === 0) s.spark = days.map(() => 0);
      s.spark[days.indexOf(b.period)] = b.runs;
    }
    return m;
  }, [recentRuns, usageByAgent.data]);

  const endpointStats: EndpointStat[] = useMemo(() => {
    const all = callbacks.data?.deliveries ?? [];
    return (project?.apiBaseUrls ?? []).map((e) => {
      const rows = all.filter((d) => d.envLabel === e.label);
      return { label: e.label, url: e.url, attempts: rows.length, ok: rows.filter((d) => d.ok).length, last: rows[0] ?? null };
    });
  }, [callbacks.data, project]);

  const activeGrants = useMemo(() => (grants.data?.grants ?? []).filter((g) => !g.revokedAt), [grants.data]);
  const serverList = useMemo(() => servers.data?.servers ?? [], [servers.data]);
  const workflowList = useMemo(() => workflows.data?.workflows ?? [], [workflows.data]);
  const waiting = approvals.data?.approvals.length ?? 0;
  const lost = summary.data ? undeliverable(summary.data.deliveries) : 0;

  const graph: CanvasGraph = useMemo(() => {
    const all = callbacks.data?.deliveries ?? [];
    const failing = new Set(
      (project?.apiBaseUrls ?? [])
        .filter((e) => isEndpointFailing(all.filter((d) => d.envLabel === e.label)))
        .map((e) => e.label),
    );
    return buildCanvasGraph({
      agents: agents.map((a) => ({ agentType: a.agentType, category: a.category, gated: a.riskTier === "high" })),
      endpoints: project?.apiBaseUrls ?? [],
      servers: serverList.map((s) => ({
        id: s.id,
        enabled: s.enabled,
        agentTypes: activeGrants.filter((g) => g.serverId === s.id).map((g) => g.agentType),
      })),
      workflowAgents: workflowList.length ? workflowList.flatMap((w) => w.steps.map((st) => st.agentType)) : null,
      liveAgents: new Set([...agentStats].filter(([, s]) => s.live > 0).map(([a]) => a)),
      waitingApprovals: waiting,
      failingEndpoints: failing,
      delivering: recentRuns.some((r) => r.delivery && ["ready", "claimed"].includes(r.delivery.status)),
    });
  }, [agents, project, serverList, activeGrants, workflowList, agentStats, waiting, recentRuns, callbacks.data]);

  return {
    graph,
    setup,
    catalog,
    keys,
    project,
    projects,
    usageNow,
    summary,
    approvals,
    workflows,
    workflowList,
    servers,
    serverList,
    activeGrants,
    callbacks,
    runs,
    recentRuns,
    agents,
    agentStats,
    endpointStats,
    waiting,
    lost,
    loading: catalog.isLoading || projects.isLoading,
  };
}

export type CanvasData = ReturnType<typeof useCanvasData>;
