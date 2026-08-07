"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as orgsApi from "@/api/orgs";
import { meKey } from "@/features/auth/hooks";
import type { OrgRole } from "@/types";

export const orgsKey = ["orgs"] as const;
export const orgKey = (orgId: string) => ["orgs", orgId] as const;
export const membersKey = (orgId: string) => ["orgs", orgId, "members"] as const;
export const invitesKey = (orgId: string) => ["orgs", orgId, "invites"] as const;
export const orgProjectsKey = (orgId: string) => ["orgs", orgId, "projects"] as const;
export const orgBillingKey = (orgId: string, month?: string) =>
  ["orgs", orgId, "billing", month ?? "current"] as const;
export const orgInvoicesKey = (orgId: string, status?: string) =>
  ["orgs", orgId, "invoices", status ?? "all"] as const;

export function useOrgs() {
  return useQuery({ queryKey: orgsKey, queryFn: () => orgsApi.listOrgs() });
}

export function useOrg(orgId: string) {
  return useQuery({ queryKey: orgKey(orgId), queryFn: () => orgsApi.getOrg(orgId), enabled: !!orgId });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgsApi.createOrg,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: meKey }),
        qc.invalidateQueries({ queryKey: orgsKey }),
      ]);
    },
  });
}

export function useUpdateOrg(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; billingEmail?: string }) =>
      orgsApi.updateOrg(orgId, input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: orgKey(orgId) }),
        qc.invalidateQueries({ queryKey: meKey }),
      ]);
    },
  });
}

export function useDeleteOrg(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => orgsApi.deleteOrg(orgId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useMembers(orgId: string) {
  return useQuery({
    queryKey: membersKey(orgId),
    queryFn: () => orgsApi.listMembers(orgId),
    enabled: !!orgId,
  });
}

export function useUpdateMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      orgsApi.updateMember(orgId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(orgId) }),
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => orgsApi.removeMember(orgId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(orgId) }),
  });
}

export function useTransferOwnership(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: string) => orgsApi.transferOwnership(orgId, toUserId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: membersKey(orgId) }),
        qc.invalidateQueries({ queryKey: meKey }),
      ]);
    },
  });
}

export function useInvites(orgId: string) {
  return useQuery({
    queryKey: invitesKey(orgId),
    queryFn: () => orgsApi.listInvites(orgId),
    enabled: !!orgId,
  });
}

export function useCreateInvite(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: OrgRole }) => orgsApi.createInvite(orgId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(orgId) }),
  });
}

export function useRevokeInvite(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => orgsApi.revokeInvite(orgId, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(orgId) }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => orgsApi.acceptInvite(token),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useOrgProjects(orgId: string) {
  return useQuery({
    queryKey: orgProjectsKey(orgId),
    queryFn: () => orgsApi.listOrgProjects(orgId),
    enabled: !!orgId,
  });
}

export function useCreateProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: orgsApi.CreateProjectInput) => orgsApi.createProject(orgId, input),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: orgProjectsKey(orgId) }),
        qc.invalidateQueries({ queryKey: orgKey(orgId) }),
        qc.invalidateQueries({ queryKey: meKey }),
      ]);
    },
  });
}

export function useOrgBillingSummary(orgId: string, month?: string) {
  return useQuery({
    queryKey: orgBillingKey(orgId, month),
    queryFn: () => orgsApi.getOrgBillingSummary(orgId, month),
    enabled: !!orgId,
  });
}

export function useOrgInvoices(orgId: string, status?: string) {
  return useQuery({
    queryKey: orgInvoicesKey(orgId, status),
    queryFn: () => orgsApi.listOrgInvoices(orgId, status),
    enabled: !!orgId,
  });
}
