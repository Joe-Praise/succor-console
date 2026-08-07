"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as projectsApi from "@/api/projects";
import { orgProjectsKey } from "@/features/orgs/hooks";

export const setupKey = (projectId: string) => ["projects", projectId, "setup"] as const;
export const keysKey = (projectId: string) => ["projects", projectId, "keys"] as const;
export const currentUsageKey = (projectId: string) => ["projects", projectId, "usage", "current"] as const;
export const usageKey = (projectId: string, params: projectsApi.UsageParams) =>
  ["projects", projectId, "usage", params] as const;
export const invoicesKey = (projectId: string, status?: string) =>
  ["projects", projectId, "invoices", status ?? "all"] as const;
export const invoiceKey = (projectId: string, invoiceNumber: string) =>
  ["projects", projectId, "invoices", "detail", invoiceNumber] as const;
export const catalogKey = (projectId?: string) => ["catalog", projectId ?? "global"] as const;
export const agentRequestsKey = (projectId: string) => ["projects", projectId, "agent-requests"] as const;
export const logsKey = (projectId: string) => ["projects", projectId, "logs"] as const;
export const callbacksKey = (projectId: string) => ["projects", projectId, "callbacks"] as const;
export const playgroundRunsKey = (projectId: string) => ["projects", projectId, "playground"] as const;

export function useProjectSetup(projectId: string) {
  return useQuery({
    queryKey: setupKey(projectId),
    queryFn: () => projectsApi.getProjectSetup(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProject(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; apiBaseUrls?: Array<{ label: string; url: string }> }) =>
      projectsApi.updateProject(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: setupKey(projectId) }),
        qc.invalidateQueries({ queryKey: orgProjectsKey(orgId) }),
      ]);
    },
  });
}

export function useRotateCallbackKey(projectId: string) {
  return useMutation({
    mutationFn: () => projectsApi.rotateCallbackKey(projectId),
  });
}

export function useKeys(projectId: string) {
  return useQuery({
    queryKey: keysKey(projectId),
    queryFn: () => projectsApi.listKeys(projectId),
    enabled: !!projectId,
  });
}

export function useMintKey(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => projectsApi.mintKey(projectId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: keysKey(projectId) }),
  });
}

export function useRevokeKey(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => projectsApi.revokeKey(projectId, keyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keysKey(projectId) }),
  });
}

export function useCurrentUsage(projectId: string) {
  return useQuery({
    queryKey: currentUsageKey(projectId),
    queryFn: () => projectsApi.getCurrentUsage(projectId),
    enabled: !!projectId,
  });
}

export function useUsage(projectId: string, params: projectsApi.UsageParams = {}) {
  return useQuery({
    queryKey: usageKey(projectId, params),
    queryFn: () => projectsApi.getUsage(projectId, params),
    enabled: !!projectId,
  });
}

export function useInvoices(projectId: string, status?: string) {
  return useQuery({
    queryKey: invoicesKey(projectId, status),
    queryFn: () => projectsApi.listInvoices(projectId, status),
    enabled: !!projectId,
  });
}

export function useInvoice(projectId: string, invoiceNumber: string) {
  return useQuery({
    queryKey: invoiceKey(projectId, invoiceNumber),
    queryFn: () => projectsApi.getInvoice(projectId, invoiceNumber),
    enabled: !!projectId && !!invoiceNumber,
  });
}

export function useSubmitPayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceNumber,
      ...input
    }: {
      invoiceNumber: string;
      paymentReference: string;
      paymentNote?: string;
    }) => projectsApi.submitPayment(projectId, invoiceNumber, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["projects", projectId, "invoices"] });
      await qc.invalidateQueries({ queryKey: ["orgs"] });
    },
  });
}

export function useCatalog(projectId?: string) {
  return useQuery({
    queryKey: catalogKey(projectId),
    queryFn: () => projectsApi.getCatalog(projectId),
  });
}

export function useAgentRequests(projectId: string) {
  return useQuery({
    queryKey: agentRequestsKey(projectId),
    queryFn: () => projectsApi.listAgentRequests(projectId),
    enabled: !!projectId,
  });
}

export function useCreateAgentRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: projectsApi.CreateAgentRequestInput) =>
      projectsApi.createAgentRequest(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentRequestsKey(projectId) }),
  });
}

export function useLogs(projectId: string, limit = 50) {
  return useQuery({
    queryKey: [...logsKey(projectId), limit],
    queryFn: () => projectsApi.listLogs(projectId, limit),
    enabled: !!projectId,
    refetchInterval: 15_000,
  });
}

export function useCallbacks(projectId: string, limit = 50) {
  return useQuery({
    queryKey: [...callbacksKey(projectId), limit],
    queryFn: () => projectsApi.listCallbacks(projectId, limit),
    enabled: !!projectId,
  });
}

export function usePlaygroundRuns(projectId: string) {
  return useQuery({
    queryKey: playgroundRunsKey(projectId),
    queryFn: () => projectsApi.listPlaygroundRuns(projectId),
    enabled: !!projectId,
    refetchInterval: 10_000,
  });
}

export function usePlaygroundRun(projectId: string, runId: string | null) {
  return useQuery({
    queryKey: [...playgroundRunsKey(projectId), runId],
    queryFn: () => projectsApi.getPlaygroundRun(projectId, runId!),
    enabled: !!projectId && !!runId,
    refetchInterval: (query) => {
      const status = (query.state.data?.run as { status?: string } | undefined)?.status;
      return status === "queued" || status === "running" ? 2_000 : false;
    },
  });
}

export function useStartPlaygroundRun(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { agentType: string; body: Record<string, unknown> }) =>
      projectsApi.startPlaygroundRun(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: playgroundRunsKey(projectId) }),
  });
}
