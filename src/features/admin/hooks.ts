"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as adminApi from "@/api/admin";

export const adminOverviewKey = ["admin", "overview"] as const;
export const adminOrgsKey = (status?: string) => ["admin", "orgs", status ?? "all"] as const;
export const adminOrgKey = (orgId: string) => ["admin", "orgs", "detail", orgId] as const;
export const adminProjectsKey = ["admin", "projects"] as const;
export const adminInvoicesKey = (status?: string) => ["admin", "invoices", status ?? "all"] as const;
export const adminUsersKey = ["admin", "users"] as const;
export const adminRequestsKey = (status?: string) => ["admin", "requests", status ?? "all"] as const;
export const adminLogsKey = ["admin", "logs"] as const;
export const revenueKey = ["admin", "revenue"] as const;
export const billingSettingsKey = ["admin", "billing-settings"] as const;

export function useAdminOverview() {
  return useQuery({ queryKey: adminOverviewKey, queryFn: adminApi.getOverview });
}

export function useAdminOrgs(status?: string) {
  return useQuery({
    queryKey: adminOrgsKey(status),
    queryFn: () => adminApi.listAdminOrgs(status),
  });
}

export function useAdminOrg(orgId: string) {
  return useQuery({
    queryKey: adminOrgKey(orgId),
    queryFn: () => adminApi.getAdminOrg(orgId),
    enabled: !!orgId,
  });
}

function invalidateOrgSurfaces(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "orgs"] }),
    qc.invalidateQueries({ queryKey: adminOverviewKey }),
  ]);
}

export function useApproveOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.approveOrg,
    onSuccess: () => invalidateOrgSurfaces(qc),
  });
}

export function useSuspendOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.suspendOrg,
    onSuccess: () => invalidateOrgSurfaces(qc),
  });
}

export function useAdminProjects() {
  return useQuery({ queryKey: adminProjectsKey, queryFn: adminApi.listAdminProjects });
}

export function useApproveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.approveProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminProjectsKey }),
  });
}

export function useSuspendProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.suspendProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminProjectsKey }),
  });
}

export function useSetProjectAgents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, enabledAgents }: { projectId: string; enabledAgents: string[] | null }) =>
      adminApi.setProjectAgents(projectId, enabledAgents),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminProjectsKey }),
  });
}

export function useUpdateAdminProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      ...input
    }: {
      projectId: string;
      markupMultiplier?: number | null;
      monthlyBudgetUsd?: number | null;
    }) => adminApi.updateAdminProject(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminProjectsKey }),
  });
}

export function useAdminInvoices(status?: string) {
  return useQuery({
    queryKey: adminInvoicesKey(status),
    queryFn: () => adminApi.listAdminInvoices(status),
  });
}

export function usePatchInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      invoiceNumber,
      ...input
    }: {
      projectId: string;
      invoiceNumber: string;
      status: "issued" | "paid" | "void";
      paymentReference?: string;
      note?: string;
    }) => adminApi.patchInvoiceStatus(projectId, invoiceNumber, input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "invoices"] }),
        qc.invalidateQueries({ queryKey: adminOverviewKey }),
      ]);
    },
  });
}

export function useGenerateAllInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.generateAllInvoices,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "invoices"] }),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: adminUsersKey, queryFn: adminApi.listAdminUsers });
}

export function usePatchAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      ...input
    }: {
      userId: string;
      active?: boolean;
      role?: "owner" | "tenant";
    }) => adminApi.patchAdminUser(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUsersKey }),
  });
}

export function useAdminAgentRequests(status?: string) {
  return useQuery({
    queryKey: adminRequestsKey(status),
    queryFn: () => adminApi.listAdminAgentRequests(status),
  });
}

export function usePatchAdminAgentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status: string; adminNotes?: string | null }) =>
      adminApi.patchAdminAgentRequest(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "requests"] }),
  });
}

export function useAdminLogs(params: { projectId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: [...adminLogsKey, params],
    queryFn: () => adminApi.listAdminLogs(params),
    refetchInterval: 10_000,
  });
}

export function useRevenue() {
  return useQuery({ queryKey: revenueKey, queryFn: adminApi.getRevenue });
}

export function useBillingSettings() {
  return useQuery({ queryKey: billingSettingsKey, queryFn: adminApi.getBillingSettings });
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateBillingSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: billingSettingsKey }),
  });
}
