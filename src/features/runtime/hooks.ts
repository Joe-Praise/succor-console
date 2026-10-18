"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as runtimeApi from "@/api/runtime";
import { ApiError } from "@/api/client";

export const jobKey = (jobId: string) => ["jobs", jobId] as const;
export const approvalsKey = (projectId: string) => ["projects", projectId, "approvals"] as const;
export const workflowsKey = (projectId: string) => ["projects", projectId, "workflows"] as const;
export const workflowKey = (projectId: string, workflowId: string) =>
  ["projects", projectId, "workflows", workflowId] as const;

/** Job states the worker is still actively moving. */
export const LIVE_JOB_STATUSES = new Set(["queued", "running"]);
/** Workflow states the advancer is still actively moving. */
export const LIVE_WORKFLOW_STATUSES = new Set(["running"]);

/**
 * One durable job. Polls fast while the worker owns it, slowly while it waits
 * on a human (pending_approval), and stops at a terminal state.
 */
export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: jobKey(jobId ?? ""),
    queryFn: () => runtimeApi.getJob(jobId!),
    enabled: !!jobId,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      if (!status) return false;
      if (LIVE_JOB_STATUSES.has(status)) return 2_000;
      if (status === "pending_approval") return 10_000;
      return false;
    },
  });
}

export function useApprovals(projectId: string) {
  return useQuery({
    queryKey: approvalsKey(projectId),
    queryFn: () => runtimeApi.listApprovals(projectId),
    enabled: !!projectId,
    refetchInterval: 20_000,
  });
}

export function useDecideApproval(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...input }: { jobId: string } & runtimeApi.ApprovalDecision) =>
      runtimeApi.decideApproval(projectId, jobId, input),
    onSettled: async (_data, _err, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: approvalsKey(projectId) }),
        qc.invalidateQueries({ queryKey: jobKey(vars.jobId) }),
        qc.invalidateQueries({ queryKey: ["projects", projectId, "audit"] }),
      ]);
    },
  });
}

export function useWorkflows(projectId: string) {
  return useQuery({
    queryKey: workflowsKey(projectId),
    queryFn: () => runtimeApi.listWorkflows(projectId),
    enabled: !!projectId,
    refetchInterval: (query) =>
      query.state.data?.workflows.some((w) => LIVE_WORKFLOW_STATUSES.has(w.status)) ? 5_000 : false,
  });
}

export function useWorkflow(projectId: string, workflowId: string) {
  return useQuery({
    queryKey: workflowKey(projectId, workflowId),
    queryFn: () => runtimeApi.getWorkflow(projectId, workflowId),
    enabled: !!projectId && !!workflowId,
    refetchInterval: (query) =>
      query.state.data && LIVE_WORKFLOW_STATUSES.has(query.state.data.status) ? 3_000 : false,
  });
}

export function useStartWorkflow(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowType, input }: { workflowType: string; input: Record<string, unknown> }) =>
      runtimeApi.startWorkflow(projectId, workflowType, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowsKey(projectId) }),
  });
}
