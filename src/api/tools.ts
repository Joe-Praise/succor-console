import { z } from "zod";

import { bff } from "./client";
import { McpServerSchema, ToolGrantSchema, type SideEffectClass } from "@/types";

// ---------------------------------------------------------------------------
// Tools surface — tenant MCP servers + agent-scoped tool grants. Writes need
// project admin; reads need developer. Server tokens are write-only: encrypted
// at rest (AES-256-GCM) and never returned.
// ---------------------------------------------------------------------------

const ServersSchema = z.object({ servers: z.array(McpServerSchema) });

export function listMcpServers(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/mcp-servers`, { schema: ServersSchema });
}

export interface RegisterMcpServerInput {
  name: string;
  url: string;
  authToken?: string;
  toolAllowlist?: string[];
}

export function registerMcpServer(projectId: string, input: RegisterMcpServerInput) {
  return bff(`/api/bff/portal/projects/${projectId}/mcp-servers`, {
    method: "POST",
    body: input,
    schema: McpServerSchema,
  });
}

export interface UpdateMcpServerInput {
  enabled?: boolean;
  url?: string;
  authToken?: string;
  toolAllowlist?: string[];
}

export function updateMcpServer(projectId: string, serverId: string, input: UpdateMcpServerInput) {
  return bff(`/api/bff/portal/projects/${projectId}/mcp-servers/${serverId}`, {
    method: "PATCH",
    body: input,
    schema: McpServerSchema,
  });
}

export function deleteMcpServer(projectId: string, serverId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/mcp-servers/${serverId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Tool grants
// ---------------------------------------------------------------------------

const GrantsSchema = z.object({ grants: z.array(ToolGrantSchema) });

export function listToolGrants(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/tool-grants`, { schema: GrantsSchema });
}

export interface CreateToolGrantInput {
  agentType: string;
  serverId: string;
  toolName: string;
  sideEffectClass?: SideEffectClass;
  /** Admin-attested JSON Schema for the tool's arguments (required since 4I.18). */
  parametersJsonSchema: Record<string, unknown>;
}

export function createToolGrant(projectId: string, input: CreateToolGrantInput) {
  return bff(`/api/bff/portal/projects/${projectId}/tool-grants`, {
    method: "POST",
    body: input,
    schema: ToolGrantSchema,
  });
}

/** Revocation is a tombstone — the grant row survives for after-the-fact review. */
export function revokeToolGrant(projectId: string, grantId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/tool-grants/${grantId}`, {
    method: "DELETE",
  });
}
