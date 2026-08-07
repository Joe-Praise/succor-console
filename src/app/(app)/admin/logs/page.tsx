"use client";

import { useState } from "react";
import { ScrollTextIcon } from "lucide-react";

import { useAdminLogs } from "@/features/admin/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  projectId?: string;
  agentType?: string;
  status?: string;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  billedUsd?: number | null;
  errorMessage?: string | null;
}

const ERROR_STATUSES = new Set(["error", "rate_limited", "validation_failed"]);

export default function AdminLogsPage() {
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const logs = useAdminLogs(filter === "errors" ? { status: "error" } : {});
  const rows = (logs.data?.logs ?? []) as LogRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Run feed"
        description="Cross-tenant agent activity (refreshes every 10 seconds)."
        action={
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "errors")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {logs.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollTextIcon} title="Nothing here" description="Runs appear as tenants call agents." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Billed</TableHead>
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
                    <TableCell className="font-mono text-xs">{log.projectId ?? "—"}</TableCell>
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
