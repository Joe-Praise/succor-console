"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollTextIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useLogs } from "@/features/projects/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** agent-service models/agent-log.model.ts — one immutable, priced row per run. */
interface LogRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  model?: string;
  status?: string;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  embeddingTokens?: number | null;
  toolCalls?: number | null;
  estimatedCostUsd?: number | null;
  billedUsd?: number | null;
  errorMessage?: string | null;
  initiatedBy?: string;
  jobId?: string | null;
}

const ERROR_STATUSES = new Set(["error", "rate_limited", "validation_failed"]);

export default function LogsPage() {
  const { orgId, projectId } = useProjectScope();
  const logs = useLogs(projectId, 200);
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const all = (logs.data ?? []) as LogRow[];
  const rows = filter === "errors" ? all.filter((r) => ERROR_STATUSES.has(r.status ?? "")) : all;
  const base = `/o/${orgId}/p/${projectId}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logs"
        description="One priced, immutable row per run — the same rows your invoice is built from. Refreshes automatically."
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "errors")}>
        <TabsList>
          <TabsTrigger value="all">All runs</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>
      </Tabs>

      {logs.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : logs.isError ? (
        <QueryError message="Couldn't load the run log." onRetry={() => void logs.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollTextIcon}
          title={filter === "errors" ? "No failed runs" : "No runs yet"}
          description={
            filter === "errors"
              ? "Nothing in the latest 200 runs failed."
              : "Trigger an agent (or use the playground) and its run appears here."
          }
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
                <TableHead className="text-right">Tools</TableHead>
                <TableHead className="text-right">Cost → billed</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log, i) => (
                <TableRow key={log._id ?? i}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {log.ts ? new Date(log.ts).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="block font-mono text-xs">{log.agentType ?? "—"}</span>
                    <span className="block font-mono text-[11px] text-faint">{log.model}</span>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <AnyStatusBadge value={log.status} />
                    {log.errorMessage ? (
                      <span className="mt-1 block truncate text-xs text-muted-foreground" title={log.errorMessage}>
                        {log.errorMessage}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {((log.inputTokens ?? 0) + (log.outputTokens ?? 0)).toLocaleString()}
                    {log.embeddingTokens ? (
                      <span className="block text-[11px] text-faint">+{log.embeddingTokens.toLocaleString()} emb</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {log.toolCalls ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    <span className="text-faint">
                      {log.estimatedCostUsd != null ? usd(log.estimatedCostUsd) : "—"} →{" "}
                    </span>
                    {log.billedUsd != null ? usd(log.billedUsd) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.jobId ? (
                      <Link href={`${base}/jobs/${log.jobId}`} className="font-mono text-xs text-brand hover:underline">
                        …{log.jobId.slice(-6)}
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
