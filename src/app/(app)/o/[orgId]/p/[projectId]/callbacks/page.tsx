"use client";

import { Suspense, useMemo, useState } from "react";
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
import { EventHistogram } from "@/components/charts/event-histogram";
import { Callout, HttpStatus, MethodMark } from "@/components/ops/primitives";

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
  const rows = useMemo(() => callbacks.data?.deliveries ?? [], [callbacks.data]);
  const traffic = useMemo(() => rows.map((d) => ({ ts: d.ts.getTime(), kind: d.ok ? ("ok" as const) : ("failed" as const) })), [rows]);
  const span = traffic.length > 1 ? { from: Math.min(...traffic.map((t) => t.ts)), to: Math.max(...traffic.map((t) => t.ts)) } : null;

  const columns: Column<CallbackDelivery>[] = [
    { id: "ts", header: "Time", cell: (d) => <span className="text-muted-foreground">{dateTime(d.ts)}</span> },
    { id: "agent", header: "Agent", cell: (d) => <span className="text-foreground">{nameOf(d.agentType)}</span> },
    { id: "env", header: "Env", cell: (d) => <span className="text-xs text-muted-foreground">{d.envLabel}</span> },
    {
      id: "endpoint",
      header: "Endpoint",
      className: "max-w-96",
      cell: (d) => (
        <span className="flex min-w-0 items-center font-mono text-xs text-foreground/85" title={d.url}>
          <MethodMark method={d.method} />
          <span className="truncate">{d.url}</span>
        </span>
      ),
    },
    {
      id: "result",
      header: "Result",
      cell: (d) => <HttpStatus status={d.responseStatus} ok={d.ok} />,
    },
    {
      id: "error",
      header: "Detail",
      className: "max-w-56",
      cell: (d) => <span className="block truncate text-xs text-muted-foreground" title={d.errorMessage ?? undefined}>{d.errorMessage ?? ""}</span>,
    },
    { id: "dur", header: "Duration", align: "right", cell: (d) => <span className="text-muted-foreground">{duration(d.durationMs)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        size="compact"
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

      <Callout tone="info" href={`${base}/docs/callbacks`}>
        Verify <code className="font-mono text-foreground">X-Succor-Callback-Key</code> on every request and dedupe on{" "}
        <code className="font-mono text-foreground">X-Delivery-Id</code>. Your 5xx, 429 and timeouts retry up to 3 times; any other 4xx is final.
      </Callout>

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

      {span ? (
        <div className="tile px-3 pt-3 pb-2">
          <EventHistogram
            ariaLabel="Callback attempts over time, from the deliveries loaded below"
            events={traffic}
            kinds={[
              { key: "ok", label: "Delivered", color: "var(--chart-3)" },
              { key: "failed", label: "Failed", color: "var(--error)" },
            ]}
            from={span.from}
            to={span.to}
            timeLabel={(t) => dateTime(new Date(t))}
          />
        </div>
      ) : null}

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
