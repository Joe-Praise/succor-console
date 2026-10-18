"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as toolsApi from "@/api/tools";

export const mcpServersKey = (projectId: string) => ["projects", projectId, "mcp-servers"] as const;
export const toolGrantsKey = (projectId: string) => ["projects", projectId, "tool-grants"] as const;

export function useMcpServers(projectId: string) {
  return useQuery({
    queryKey: mcpServersKey(projectId),
    queryFn: () => toolsApi.listMcpServers(projectId),
    enabled: !!projectId,
  });
}

export function useRegisterMcpServer(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: toolsApi.RegisterMcpServerInput) =>
      toolsApi.registerMcpServer(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpServersKey(projectId) }),
  });
}

export function useUpdateMcpServer(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, ...input }: { serverId: string } & toolsApi.UpdateMcpServerInput) =>
      toolsApi.updateMcpServer(projectId, serverId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: mcpServersKey(projectId) }),
  });
}

export function useDeleteMcpServer(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) => toolsApi.deleteMcpServer(projectId, serverId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: mcpServersKey(projectId) }),
        qc.invalidateQueries({ queryKey: toolGrantsKey(projectId) }),
      ]);
    },
  });
}

export function useToolGrants(projectId: string) {
  return useQuery({
    queryKey: toolGrantsKey(projectId),
    queryFn: () => toolsApi.listToolGrants(projectId),
    enabled: !!projectId,
  });
}

export function useCreateToolGrant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: toolsApi.CreateToolGrantInput) => toolsApi.createToolGrant(projectId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: toolGrantsKey(projectId) }),
  });
}

export function useRevokeToolGrant(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => toolsApi.revokeToolGrant(projectId, grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: toolGrantsKey(projectId) }),
  });
}
