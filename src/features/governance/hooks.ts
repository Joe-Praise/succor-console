"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as govApi from "@/api/governance";
import type { Profile } from "@/types";

export const auditKey = (projectId: string, filters: Omit<govApi.AuditQuery, "cursor">) =>
  ["projects", projectId, "audit", filters] as const;
export const profileKey = (projectId: string) => ["projects", projectId, "profile"] as const;
export const ticketsKey = (projectId: string) => ["projects", projectId, "tickets"] as const;

/** Keyset-paginated ledger: each page hands back the cursor for the next. */
export function useAuditEvents(projectId: string, filters: Omit<govApi.AuditQuery, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: auditKey(projectId, filters),
    queryFn: ({ pageParam }) =>
      govApi.listAuditEvents(projectId, { ...filters, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!projectId,
  });
}

export function useProfile(projectId: string) {
  return useQuery({
    queryKey: profileKey(projectId),
    queryFn: () => govApi.getProfile(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProfile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: Profile) => govApi.updateProfile(projectId, profile),
    onSuccess: (data) => qc.setQueryData(profileKey(projectId), data),
  });
}

export function useTickets(projectId: string) {
  return useQuery({
    queryKey: ticketsKey(projectId),
    queryFn: () => govApi.listTickets(projectId),
    enabled: !!projectId,
  });
}

export function useCreateTicket(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject: string; message: string }) => govApi.createTicket(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketsKey(projectId) }),
  });
}
