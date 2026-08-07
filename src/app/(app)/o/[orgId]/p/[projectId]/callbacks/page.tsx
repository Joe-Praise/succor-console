"use client";

import { useState } from "react";
import { toast } from "sonner";
import { WebhookIcon, RefreshCwIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks, useRotateCallbackKey } from "@/features/projects/hooks";
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

interface DeliveryRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  url?: string;
  ok?: boolean;
  statusCode?: number | null;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export default function CallbacksPage() {
  const { projectId } = useProjectScope();
  const callbacks = useCallbacks(projectId);
  const rotate = useRotateCallbackKey(projectId);
  const [rotated, setRotated] = useState<string | null>(null);

  const deliveries = (callbacks.data?.deliveries ?? []) as DeliveryRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Callbacks"
        description="Every result we delivered to your endpoints, signed with your callback key."
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

      {callbacks.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={WebhookIcon}
          title="No deliveries yet"
          description="Once an agent completes a run, its callback to your API shows up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Agent</TableHead>
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
                  <TableCell className="max-w-64 truncate font-mono text-xs text-muted-foreground">
                    {d.url ?? "—"}
                  </TableCell>
                  <TableCell>
                    {d.ok ? (
                      <span className="text-sm text-success">
                        {d.statusCode ?? "OK"}
                      </span>
                    ) : (
                      <span className="text-sm text-error" title={d.errorMessage ?? undefined}>
                        {d.statusCode ?? "Failed"}
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
