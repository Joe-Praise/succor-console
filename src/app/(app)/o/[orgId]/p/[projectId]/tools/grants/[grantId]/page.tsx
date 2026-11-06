"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useMcpServers, useRevokeToolGrant, useToolGrants } from "@/features/tools/hooks";
import { CLASS_COPY, errMessage } from "@/features/tools/copy";
import { useCatalog } from "@/features/projects/hooks";
import { RoleGate } from "@/features/orgs/org-context";
import { dateTime } from "@/lib/format";
import type { SideEffectClass } from "@/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { JsonPanel } from "@/components/json-panel";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Callout, Section } from "@/components/ops/primitives";

export default function ToolGrantPage() {
  const { orgId, projectId } = useProjectScope();
  const { grantId } = useParams<{ grantId: string }>();
  const grants = useToolGrants(projectId);
  const servers = useMcpServers(projectId);
  const catalog = useCatalog(projectId);
  const revoke = useRevokeToolGrant(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: grants, backHref: `${base}/tools`, backLabel: "Tools", noun: "tool grant" });
  if (state) return state;
  const g = grants.data?.grants.find((x) => x.id === grantId);
  if (!g) return <DetailNotFound backHref={`${base}/tools`} backLabel="Tools" noun="tool grant" />;

  const server = servers.data?.servers.find((s) => s.id === g.serverId) ?? null;
  const agent = catalog.data?.catalog.find((e) => e.agentType === g.agentType) ?? null;
  const cls = CLASS_COPY[g.sideEffectClass as SideEffectClass];
  const exposable = !g.revokedAt && !!agent?.toolsEnabled && !!server?.enabled && cls?.runnable && !!g.parametersJsonSchema;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Tools", href: `${base}/tools` }, { label: `${g.agentType} → ${g.toolName}` }]}
      eyebrow="Tool grant"
      title={`${g.toolName}`}
      id={g.id}
      status={<StatusBadge status={g.revokedAt ? "revoked" : "active"} />}
      actions={
        !g.revokedAt ? (
          <RoleGate min="admin">
            <Button
              variant="destructive"
              size="sm"
              disabled={revoke.isPending}
              onClick={() => {
                if (!window.confirm(`Revoke ${g.agentType} → ${g.toolName}?`)) return;
                revoke.mutate(g.id, {
                  onSuccess: () => toast.success("Grant revoked — the row is kept for the record"),
                  onError: (err) => toast.error(errMessage(err, "Revoke failed")),
                });
              }}
            >
              Revoke grant
            </Button>
          </RoleGate>
        ) : null
      }
      facts={[
        { label: "Agent", value: <Link href={`${base}/agents/${g.agentType}`} className="font-mono text-xs text-brand hover:underline">{g.agentType}</Link> },
        {
          label: "Server",
          value: server ? (
            <Link href={`${base}/tools/servers/${server.id}`} className="text-brand hover:underline">
              {server.name}
            </Link>
          ) : (
            <span className="text-faint">deleted</span>
          ),
        },
        { label: "Side-effect class", value: cls?.label ?? g.sideEffectClass },
        { label: "Granted", value: dateTime(g.createdAt) },
      ]}
      aside={
        <div className="space-y-3 tile p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Lifecycle</p>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-faint">Granted by</dt>
              <dd className="font-mono break-all text-foreground">{g.grantedBy}</dd>
            </div>
            <div>
              <dt className="text-faint">Revoked</dt>
              <dd className="text-foreground">
                {g.revokedAt ? `${dateTime(g.revokedAt)}${g.revokedBy ? ` by ${g.revokedBy}` : ""}` : "—"}
              </dd>
            </div>
          </dl>
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Revoking keeps this row — &ldquo;what allowed this, and when did it stop?&rdquo; stays answerable.
          </p>
        </div>
      }
    >
      <Callout tone={exposable ? "success" : "info"} title={exposable ? "This tool can reach the model" : "This tool is not exposed to the model"}>
        {exposable ? (
          "The agent is built for tool use, the server is enabled, the class is read-only and a schema is attested."
        ) : (
          <ul className="list-disc space-y-0.5 pl-4">
            {g.revokedAt ? <li>The grant is revoked.</li> : null}
            {!agent?.toolsEnabled ? <li>{g.agentType} isn&apos;t built for tool use yet (platform opt-in).</li> : null}
            {server && !server.enabled ? <li>The server is disabled.</li> : null}
            {!server ? <li>The server no longer exists.</li> : null}
            {cls && !cls.runnable ? <li>Only read-only tools execute today ({cls.note.toLowerCase()})</li> : null}
            {!g.parametersJsonSchema ? <li>No argument schema is attested — a legacy grant can never become a capability.</li> : null}
          </ul>
        )}
      </Callout>

      <Section title="Attested argument schema" description="The shape the model is shown, as the granting admin attested it.">
        <JsonPanel
          value={g.parametersJsonSchema ?? null}
          label="parametersJsonSchema"
          empty="No schema on this legacy grant."
        />
      </Section>
    </DetailPage>
  );
}
