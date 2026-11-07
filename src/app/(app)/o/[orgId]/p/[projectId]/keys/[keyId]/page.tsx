"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRoundIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useKeys, useRevokeKey } from "@/features/projects/hooks";
import { useRuns } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { RoleGate } from "@/features/orgs/org-context";
import { ApiError } from "@/api/client";
import { dateTime, relativeTime, shortId, usdPrecise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge, AnyStatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { Callout, Section } from "@/components/ops/primitives";

export default function ApiKeyPage() {
  const { orgId, projectId } = useProjectScope();
  const { keyId } = useParams<{ keyId: string }>();
  const router = useRouter();
  const keys = useKeys(projectId);
  const revoke = useRevokeKey(projectId);
  const { nameOf } = useAgentNames(projectId);
  // API-key callers are recorded as `apikey:<projectId>`, so runs can only be
  // attributed to "an API key on this project", not to this specific key.
  const runs = useRuns(projectId, { initiatedBy: `apikey:${projectId}`, limit: 10 });
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: keys, backHref: `${base}/keys`, backLabel: "All API keys", noun: "API key" });
  if (state) return state;
  const k = keys.data?.keys.find((x) => x.id === keyId);
  if (!k) return <DetailNotFound backHref={`${base}/keys`} backLabel="All API keys" noun="API key" />;
  const recent = runs.data?.pages[0]?.jobs ?? [];

  return (
    <DetailPage
      breadcrumbs={[{ label: "API keys", href: `${base}/keys` }, { label: k.name }]}
      eyebrow="API key"
      title={k.name}
      status={<StatusBadge status={k.revokedAt ? "revoked" : "active"} />}
      actions={
        !k.revokedAt ? (
          <RoleGate min="admin">
            <Button
              variant="destructive"
              size="sm"
              disabled={revoke.isPending}
              onClick={() => {
                if (!window.confirm(`Revoke "${k.name}"? Calls using it fail immediately.`)) return;
                revoke.mutate(k.id, {
                  onSuccess: () => {
                    toast.success("Key revoked");
                    router.push(`${base}/keys`);
                  },
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "Revoke failed"),
                });
              }}
            >
              Revoke key
            </Button>
          </RoleGate>
        ) : null
      }
      facts={[
        { label: "Key", value: <span className="font-mono text-xs">{k.prefix}…{k.last4}</span> },
        { label: "Created by", value: <span className="font-mono text-xs">{shortId(k.createdBy)}</span> },
        { label: "Last used", value: k.lastUsedAt ? `${relativeTime(k.lastUsedAt)} · ${dateTime(k.lastUsedAt)}` : "Never" },
        { label: "Revoked", value: k.revokedAt ? dateTime(k.revokedAt) : "—" },
      ]}
      aside={
        <div className="space-y-2 tile p-4 text-sm">
          <KeyRoundIcon className="size-4 text-brand" />
          <p className="font-medium text-foreground">How this key is stored</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only a SHA-256 hash is kept — the full key was shown once, when it was minted, and can&apos;t be recovered.
            &ldquo;Last used&rdquo; is refreshed at most about once a minute. Lost it? Mint a new key and revoke this one.
          </p>
        </div>
      }
    >
      <Section
        title="Recent runs started with an API key"
        description="Runs this project's backend started using any of its API keys."
        actions={
          <Link href={`${base}/runs`} className="text-xs text-brand hover:underline">
            All runs →
          </Link>
        }
      >
        <Callout tone="info">
          Runs are attributed to <span className="font-mono">apikey:{projectId}</span> — every key on this project shares
          that actor today, so this list can&apos;t be narrowed to this key alone.
        </Callout>
        <DataTable
          rows={recent}
          getRowKey={(r) => r.id}
          getRowHref={(r) => `${base}/runs/${r.id}`}
          getRowLabel={(r) => `Open run ${r.id}`}
          loading={runs.isLoading}
          error={runs.isError ? { message: "Couldn't load runs.", onRetry: () => void runs.refetch() } : null}
          empty={<p className="text-sm text-muted-foreground">No runs have been started with an API key yet.</p>}
          columns={[
            { id: "status", header: "Status", cell: (r) => <AnyStatusBadge value={r.status} /> },
            { id: "agent", header: "Agent", cell: (r) => nameOf(r.agentType) },
            { id: "created", header: "Created", cell: (r) => <span className="text-muted-foreground">{relativeTime(r.createdAt)}</span> },
            { id: "billed", header: "Billed", align: "right", cell: (r) => (r.cost ? usdPrecise(r.cost.billedUsd) : "—") },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
