"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { LockKeyholeIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useMcpServers, useToolGrants, useUpdateMcpServer } from "@/features/tools/hooks";
import { CLASS_COPY, errMessage } from "@/features/tools/copy";
import { useOrgCtx } from "@/features/orgs/org-context";
import { ORG_ROLE_RANK } from "@/lib/permissions";
import { dateTime } from "@/lib/format";
import type { SideEffectClass } from "@/types";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { Section } from "@/components/ops/primitives";

export default function McpServerPage() {
  const { orgId, projectId } = useProjectScope();
  const { serverId } = useParams<{ serverId: string }>();
  const { role } = useOrgCtx();
  const servers = useMcpServers(projectId);
  const grants = useToolGrants(projectId);
  const update = useUpdateMcpServer(projectId);
  const base = `/o/${orgId}/p/${projectId}`;
  const isAdmin = ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin;

  const state = renderDetailState({ query: servers, backHref: `${base}/tools`, backLabel: "Tools", noun: "MCP server" });
  if (state) return state;
  const s = servers.data?.servers.find((x) => x.id === serverId);
  if (!s) return <DetailNotFound backHref={`${base}/tools`} backLabel="Tools" noun="MCP server" />;
  const serverGrants = (grants.data?.grants ?? []).filter((g) => g.serverId === s.id);

  return (
    <DetailPage
      breadcrumbs={[{ label: "Tools", href: `${base}/tools` }, { label: s.name }]}
      eyebrow="MCP server"
      title={s.name}
      id={s.id}
      status={<StatusBadge status={s.enabled ? "enabled" : "disabled"} />}
      actions={
        isAdmin ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={s.enabled}
              onCheckedChange={(on) =>
                update.mutate(
                  { serverId: s.id, enabled: on },
                  {
                    onSuccess: () => toast.success(on ? "Server enabled" : "Server disabled"),
                    onError: (err) => toast.error(errMessage(err, "Update failed")),
                  },
                )
              }
            />
            {s.enabled ? "Enabled" : "Disabled"}
          </label>
        ) : null
      }
      facts={[
        { label: "Endpoint", value: <span className="font-mono text-xs">{s.url}</span> },
        {
          label: "Auth token",
          value: s.hasAuthToken ? (
            <span className="inline-flex items-center gap-1">
              <LockKeyholeIcon className="size-3.5 text-brand" /> Set · encrypted
            </span>
          ) : (
            "None"
          ),
        },
        { label: "Registered", value: dateTime(s.createdAt) },
        { label: "Updated", value: dateTime(s.updatedAt) },
      ]}
      aside={
        <div className="space-y-2 tile p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Safety rails</p>
          <p>The URL is SSRF-checked at registration and again on every request, including each redirect hop.</p>
          <p>The bearer token is AES-256-GCM encrypted at rest and never returned by the API — rotate it from Tools.</p>
          <p>Tools only run inside durable jobs, never in the playground.</p>
        </div>
      }
    >
      <Section
        title="Exposed tools"
        description={
          s.toolAllowlist.length
            ? "Only these tools can be granted to an agent."
            : "No allowlist — any tool the server lists can be granted."
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {s.toolAllowlist.length ? (
            s.toolAllowlist.map((t) => (
              <span key={t} className="rounded-md bg-raised px-2 py-1 font-mono text-xs text-muted-foreground">
                {t}
              </span>
            ))
          ) : (
            <span className="text-sm text-faint">All listed tools</span>
          )}
        </div>
      </Section>

      <Section
        title="Grants on this server"
        description="Which agents may call which of its tools."
        actions={
          <Link href={`${base}/tools`} className="text-xs text-brand hover:underline">
            Issue a grant →
          </Link>
        }
      >
        <DataTable
          rows={serverGrants}
          getRowKey={(g) => g.id}
          getRowHref={(g) => `${base}/tools/grants/${g.id}`}
          getRowLabel={(g) => `Open grant ${g.agentType} → ${g.toolName}`}
          loading={grants.isLoading}
          empty={<p className="text-sm text-muted-foreground">No agent has been granted a tool on this server.</p>}
          columns={[
            { id: "agent", header: "Agent", cell: (g) => <span className="font-mono text-xs">{g.agentType}</span> },
            { id: "tool", header: "Tool", cell: (g) => <span className="font-mono text-xs text-muted-foreground">{g.toolName}</span> },
            {
              id: "class",
              header: "Class",
              cell: (g) => CLASS_COPY[g.sideEffectClass as SideEffectClass]?.label ?? g.sideEffectClass,
            },
            { id: "state", header: "State", cell: (g) => <StatusBadge status={g.revokedAt ? "revoked" : "active"} /> },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
