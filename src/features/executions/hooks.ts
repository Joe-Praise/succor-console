"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import * as execApi from "@/api/executions";
import { ApiError } from "@/api/client";
import { holdWithinProject } from "@/lib/hold-previous";
import { LIVE_JOB_STATUSES, PARKED_JOB_STATUSES, TERMINAL_DELIVERY_STATUSES } from "@/lib/status";
import type { ExecutionRecord } from "@/types";

// Query keys — everything under ["projects", id, "executions", …] so a mutation
// can target exactly the affected resource.
export const runsKey = (projectId: string, query: Omit<execApi.RunListQuery, "cursor">) =>
  ["projects", projectId, "executions", "runs", query] as const;
export const executionKey = (projectId: string, jobId: string) =>
  ["projects", projectId, "executions", "record", jobId] as const;
export const checkpointKey = (projectId: string, jobId: string, name: string) =>
  ["projects", projectId, "executions", "checkpoint", jobId, name] as const;
export const usageRecordsKey = (projectId: string, query: Omit<execApi.UsageRecordQuery, "cursor">) =>
  ["projects", projectId, "executions", "usage-records", query] as const;
export const usageRecordKey = (projectId: string, id: string) =>
  ["projects", projectId, "executions", "usage-record", id] as const;
export const callbackDeliveryKey = (projectId: string, id: string) =>
  ["projects", projectId, "executions", "callback", id] as const;
export const auditEventKey = (projectId: string, id: string) =>
  ["projects", projectId, "executions", "audit-event", id] as const;
export const opsSummaryKey = (projectId: string, range: { from?: string; to?: string }) =>
  ["projects", projectId, "executions", "ops-summary", range] as const;

/** Don't retry a 404/403 — the record isn't coming back by asking again. */
function retryUnlessFinal(count: number, err: unknown): boolean {
  if (err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 400)) return false;
  return count < 2;
}

/** Runs, newest first, keyset-paginated. Polls page one only while it shows live work. */
export function useRuns(
  projectId: string,
  query: Omit<execApi.RunListQuery, "cursor"> = {},
  opts: { tailMs?: number } = {},
) {
  return useInfiniteQuery({
    queryKey: runsKey(projectId, query),
    queryFn: ({ pageParam }) => execApi.listRuns(projectId, { ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!projectId,
    retry: retryUnlessFinal,
    refetchInterval: (q) =>
      opts.tailMs ?? (q.state.data?.pages[0]?.jobs.some((j) => LIVE_JOB_STATUSES.has(j.status)) ? 5_000 : false),
  });
}

/** True while the worker or the delivery engine is still moving this run. */
export function isExecutionLive(rec: ExecutionRecord | undefined): boolean {
  if (!rec) return false;
  if (LIVE_JOB_STATUSES.has(rec.job.status)) return true;
  return rec.effects.some((e) => e.kind === "http.callback" && !TERMINAL_DELIVERY_STATUSES.has(e.status));
}

/**
 * One execution record. Polls fast while the worker or delivery engine owns it,
 * slowly while it waits on a human, and stops when everything is terminal.
 * TanStack pauses interval refetches while the tab is hidden.
 */
export function useExecution(projectId: string, jobId: string | null) {
  return useQuery({
    queryKey: executionKey(projectId, jobId ?? ""),
    queryFn: () => execApi.getExecution(projectId, jobId!),
    enabled: !!projectId && !!jobId,
    retry: retryUnlessFinal,
    refetchInterval: (q) => {
      const rec = q.state.data;
      if (!rec) return false;
      if (isExecutionLive(rec)) return 2_500;
      if (PARKED_JOB_STATUSES.has(rec.job.status)) return 15_000;
      return false;
    },
  });
}

/** One checkpoint's saved output — fetched only when a step is opened. */
export function useCheckpointOutput(projectId: string, jobId: string, name: string | null) {
  return useQuery({
    queryKey: checkpointKey(projectId, jobId, name ?? ""),
    queryFn: () => execApi.getCheckpointOutput(projectId, jobId, name!),
    enabled: !!projectId && !!jobId && !!name,
    retry: retryUnlessFinal,
    staleTime: Infinity, // a committed checkpoint never changes
  });
}

export function useUsageRecords(projectId: string, query: Omit<execApi.UsageRecordQuery, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: usageRecordsKey(projectId, query),
    queryFn: ({ pageParam }) => execApi.listUsageRecords(projectId, { ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!projectId,
    retry: retryUnlessFinal,
  });
}

export function useUsageRecord(projectId: string, id: string) {
  return useQuery({
    queryKey: usageRecordKey(projectId, id),
    queryFn: () => execApi.getUsageRecord(projectId, id),
    enabled: !!projectId && !!id,
    retry: retryUnlessFinal,
    staleTime: Infinity, // billing rows are immutable
  });
}

export function useCallbackDelivery(projectId: string, id: string) {
  return useQuery({
    queryKey: callbackDeliveryKey(projectId, id),
    queryFn: () => execApi.getCallbackDelivery(projectId, id),
    enabled: !!projectId && !!id,
    retry: retryUnlessFinal,
    staleTime: Infinity,
  });
}

export function useAuditEvent(projectId: string, id: string) {
  return useQuery({
    queryKey: auditEventKey(projectId, id),
    queryFn: () => execApi.getAuditEvent(projectId, id),
    enabled: !!projectId && !!id,
    retry: retryUnlessFinal,
    staleTime: Infinity, // the ledger is append-only
  });
}

export function useOpsSummary(projectId: string, range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: opsSummaryKey(projectId, range),
    queryFn: () => execApi.getOpsSummary(projectId, range),
    enabled: !!projectId,
    placeholderData: holdWithinProject(projectId),
    retry: retryUnlessFinal,
    refetchInterval: 30_000,
  });
}
