"use client";

import { ScrollTextIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useLogs } from "@/features/projects/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LogRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  model?: string;
  status?: string;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  billedUsd?: number | null;
  errorMessage?: string | null;
}

const ERROR_STATUSES = new Set(["error", "rate_limited", "validation_failed"]);

export default function LogsPage() {
  const { projectId } = useProjectScope();
  const logs = useLogs(projectId);
  const rows = (logs.data ?? []) as LogRow[];

  return (
    <div className="space-y-8">
      <PageHeader title="Logs" description="Recent agent runs on this project (refreshes automatically)." />

      {logs.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollTextIcon}
          title="No runs yet"
          description="Trigger an agent (or use the playground) and its run appears here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log, i) => {
                const isError = ERROR_STATUSES.has(log.status ?? "");
                return (
                  <TableRow key={log._id ?? i}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {log.ts ? new Date(log.ts).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.agentType ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn("text-sm", isError ? "text-error" : "text-success")}
                        title={log.errorMessage ?? undefined}
                      >
                        {log.status ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {((log.inputTokens ?? 0) + (log.outputTokens ?? 0)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {log.billedUsd != null ? usd(log.billedUsd) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
