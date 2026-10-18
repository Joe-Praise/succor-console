"use client";

import { useState } from "react";
import { toast } from "sonner";
import { WebhookIcon, RefreshCwIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks, useRotateCallbackKey } from "@/features/projects/hooks";
import { QueryError } from "@/components/query-error";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate } from "@/features/orgs/org-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SecretReveal } from "@/components/secret-reveal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";

/** agent-service models/callback-delivery.model.ts (30-day TTL). */
interface DeliveryRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  method?: string;
  url?: string;
  envLabel?: string;
  ok?: boolean;
  responseStatus?: number | null;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export default function CallbacksPage() {
  const { projectId } = useProjectScope();
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const callbacks = useCallbacks(projectId, 100, filter === "failed" ? false : undefined);
  const rotate = useRotateCallbackKey(projectId);
  const [rotated, setRotated] = useState<string | null>(null);

  const deliveries = (callbacks.data?.deliveries ?? []) as DeliveryRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Callbacks"
        description="Every delivery to your API in the last 30 days — retried up to 3× on 5xx, 429 and timeouts."
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
                  onError: (err) =>
                    toast.error(err instanceof ApiError ? err.message : "Rotation failed"),
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
          Every request carries <code className="font-mono text-foreground">X-Succor-Callback-Key</code>{" "}
          (and the legacy <code className="font-mono">X-Agent-API-Key</code>). Reject anything that doesn&apos;t match.
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Make handlers idempotent</p>
          A delivery can arrive more than once after a crash or retry. Durable deliveries carry a stable{" "}
          <code className="font-mono text-foreground">X-Delivery-Id</code> — dedupe on it, or rely on the
          PUT being keyed by your own id.
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-medium text-foreground">4xx means stop</p>
          Your 5xx, 429 and timeouts are retried with backoff. Any other 4xx is treated as permanent
          and the delivery is not retried.
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "failed")}>
        <TabsList>
          <TabsTrigger value="all">All deliveries</TabsTrigger>
          <TabsTrigger value="failed">Failed only</TabsTrigger>
        </TabsList>
      </Tabs>

      {callbacks.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : callbacks.isError ? (
        <QueryError message="Couldn't load deliveries." onRetry={() => void callbacks.refetch()} />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={WebhookIcon}
          title={filter === "failed" ? "No failed deliveries" : "No deliveries yet"}
          description={
            filter === "failed"
              ? "Every delivery in the last 30 days reached your API."
              : "Once an agent completes a run, its callback to your API shows up here."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Env</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d, i) => (
                <TableRow key={d._id ?? i}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {d.ts ? new Date(d.ts).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.agentType ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.envLabel ?? "—"}</TableCell>
                  <TableCell className="max-w-72 truncate font-mono text-xs text-muted-foreground" title={d.url}>
                    {d.method ? <span className="text-foreground">{d.method} </span> : null}
                    {d.url ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-56">
                    {d.ok ? (
                      <span className="text-sm text-success">
                        {d.responseStatus ?? "OK"}
                      </span>
                    ) : (
                      <span className="block text-sm text-error" title={d.errorMessage ?? undefined}>
                        {d.responseStatus ?? "No response"}
                        {d.errorMessage ? (
                          <span className="block truncate text-xs text-muted-foreground">{d.errorMessage}</span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {d.durationMs != null ? `${d.durationMs} ms` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
