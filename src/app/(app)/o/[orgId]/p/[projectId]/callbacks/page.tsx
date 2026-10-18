"use client";

import { Suspense, useState } from "react";
import { toast } from "sonner";
import { WebhookIcon, RefreshCwIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks, useRotateCallbackKey } from "@/features/projects/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { RoleGate } from "@/features/orgs/org-context";
import { useUrlFilters } from "@/lib/url-filters";
import { dateTime, duration } from "@/lib/format";
import type { CallbackDelivery } from "@/types";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SecretReveal } from "@/components/secret-reveal";
import { DataTable, type Column } from "@/components/ops/data-table";
import { FilterBar, SelectFilter } from "@/components/ops/filters";

const FILTER_KEYS = ["result", "agent"] as const;

function deliveryId(d: CallbackDelivery): string {
  return d.id ?? d._id ?? "";
}

function CallbacksExplorer() {
  const { orgId, projectId } = useProjectScope();
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const { nameOf, entries } = useAgentNames(projectId);
  const ok = values.result === "failed" ? false : values.result === "ok" ? true : undefined;
  const callbacks = useCallbacks(projectId, 200, ok, values.agent || undefined);
  const rotate = useRotateCallbackKey(projectId);
  const [rotated, setRotated] = useState<string | null>(null);
  const base = `/o/${orgId}/p/${projectId}`;
  const rows = callbacks.data?.deliveries ?? [];

  const columns: Column<CallbackDelivery>[] = [
    { id: "ts", header: "Time", cell: (d) => <span className="text-muted-foreground">{dateTime(d.ts)}</span> },
    { id: "agent", header: "Agent", cell: (d) => <span className="text-foreground">{nameOf(d.agentType)}</span> },
    { id: "env", header: "Env", cell: (d) => <span className="text-xs text-muted-foreground">{d.envLabel}</span> },
    {
      id: "endpoint",
      header: "Endpoint",
      className: "max-w-80",
      cell: (d) => (
        <span className="block truncate font-mono text-xs text-muted-foreground" title={d.url}>
          <span className="text-foreground">{d.method}</span> {d.url}
        </span>
      ),
    },
    {
      id: "result",
      header: "Result",
      cell: (d) =>
        d.ok ? (
          <span className="text-sm text-success">{d.responseStatus ?? "OK"}</span>
        ) : (
          <span className="block max-w-56 text-sm text-error">
            {d.responseStatus ?? "No response"}
            {d.errorMessage ? <span className="block truncate text-xs text-muted-foreground">{d.errorMessage}</span> : null}
          </span>
        ),
    },
    { id: "dur", header: "Duration", align: "right", cell: (d) => <span className="text-muted-foreground">{duration(d.durationMs)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
        eyebrow="Operate"
        title="Callbacks"
        description="Every HTTP delivery attempt to your API in the last 30 days. 5xx, 429 and timeouts are retried up to 3×."
        action={
          <RoleGate min="admin">
            <Button
              variant="outline"
              size="sm"
              disabled={rotate.isPending}
              onClick={() => {
                if (!window.confirm("Rotate the callback key? The old key stops working immediately.")) return;
                rotate.mutate(undefined, {
                  onSuccess: (r) => setRotated(r.agentApiKey),
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "Rotation failed"),
                });
              }}
            >
              <RefreshCwIcon />
              Rotate callback key
            </Button>
          </RoleGate>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Verify the header</p>
          Every request carries <code className="font-mono text-foreground">X-Succor-Callback-Key</code> (and the legacy{" "}
          <code className="font-mono">X-Agent-API-Key</code>). Reject anything that doesn&apos;t match.
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Make handlers idempotent</p>
          A delivery can arrive more than once after a crash or retry. Durable deliveries carry a stable{" "}
          <code className="font-mono text-foreground">X-Delivery-Id</code> — dedupe on it.
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">4xx means stop</p>
          Your 5xx, 429 and timeouts are retried with backoff. Any other 4xx is permanent and not retried.
        </div>
      </div>

      <FilterBar active={active} onClear={reset} onRefresh={() => void callbacks.refetch()} refreshing={callbacks.isFetching}>
        <SelectFilter
          label="Result"
          value={values.result}
          options={[
            { value: "ok", label: "Accepted (2xx)" },
            { value: "failed", label: "Failed" },
          ]}
          onChange={(v) => set({ result: v })}
        />
        <SelectFilter
          label="Agent"
          value={values.agent}
          options={entries.map((e) => ({ value: e.agentType, label: e.name }))}
          onChange={(v) => set({ agent: v })}
        />
      </FilterBar>

      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(d) => deliveryId(d) || `${d.ts.toISOString()}-${d.url}`}
        getRowHref={(d) => (deliveryId(d) ? `${base}/callbacks/${deliveryId(d)}` : null)}
        getRowLabel={(d) => `Open delivery to ${d.url} at ${dateTime(d.ts)}`}
        loading={callbacks.isLoading}
        error={callbacks.isError ? { message: "Couldn't load deliveries.", onRetry: () => void callbacks.refetch() } : null}
        empty={
          <EmptyState
            icon={WebhookIcon}
            title={active ? "No deliveries match these filters" : "No deliveries yet"}
            description={
              active
                ? "Clear a filter to see more."
                : "Once an agent completes a run, its callback to your API shows up here."
            }
          />
        }
        footer={rows.length >= 200 ? <p className="text-xs text-faint">Showing the latest 200 deliveries.</p> : null}
      />

      {rotated ? (
        <SecretReveal
          open={!!rotated}
          onOpenChange={(open) => {
            if (!open) setRotated(null);
          }}
          secret={rotated}
          label="callback key"
          prefix="cbk_"
        />
      ) : null}
    </div>
  );
}

export default function CallbacksPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <CallbacksExplorer />
    </Suspense>
  );
}
