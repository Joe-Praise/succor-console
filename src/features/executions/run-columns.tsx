"use client";

import { LIVE_JOB_STATUSES } from "@/lib/status";
import { duration, elapsedMs, relativeTime, dateTime, usdPrecise, shortId } from "@/lib/format";
import type { RunRow } from "@/types";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import type { Column } from "@/components/ops/data-table";
import { DeliveryBadge } from "@/components/ops/primitives";

export type RunColumnId = "status" | "run" | "outcome" | "delivery" | "attempts" | "created" | "elapsed" | "billed" | "actor";

/**
 * The one definition of a run row, shared by the runs explorer and the overview so
 * job status, run outcome and delivery stay three separate columns everywhere.
 */
export function runColumns(nameOf: (agentType: string) => string, only?: RunColumnId[]): Column<RunRow>[] {
  const all: Array<Column<RunRow> & { id: RunColumnId }> = [
    { id: "status", header: "Status", cell: (r) => <AnyStatusBadge value={r.status} /> },
    {
      id: "run",
      header: "Run",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{nameOf(r.agentType)}</p>
          <p className="font-mono text-[11px] text-faint">{shortId(r.id)}</p>
        </div>
      ),
    },
    {
      id: "outcome",
      header: "Outcome",
      cell: (r) => (r.runStatus ? <AnyStatusBadge value={r.runStatus} /> : <span className="text-faint">—</span>),
    },
    {
      id: "delivery",
      header: "Delivery",
      cell: (r) => (r.delivery ? <DeliveryBadge delivery={r.delivery} /> : <span className="text-faint">—</span>),
    },
    {
      id: "attempts",
      header: "Attempts",
      align: "right",
      cell: (r) => (
        <span className={r.attempt > 1 ? "text-warning" : "text-muted-foreground"}>
          {r.attempt}/{r.maxAttempts}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (r) => (
        <span className="text-muted-foreground" title={dateTime(r.createdAt)}>
          {relativeTime(r.createdAt)}
        </span>
      ),
    },
    {
      id: "elapsed",
      header: "Elapsed",
      align: "right",
      cell: (r) =>
        LIVE_JOB_STATUSES.has(r.status) ? (
          <span className="text-info">in progress</span>
        ) : (
          <span className="text-muted-foreground" title="Job created → last recorded state change">
            {duration(elapsedMs(r.createdAt, r.updatedAt))}
          </span>
        ),
    },
    {
      id: "billed",
      header: "Billed",
      align: "right",
      cell: (r) =>
        r.cost ? (
          <span title={`Provider cost ${usdPrecise(r.cost.costUsd)}`}>{usdPrecise(r.cost.billedUsd)}</span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      id: "actor",
      header: "Initiated by",
      cell: (r) => <span className="block max-w-40 truncate font-mono text-[11px] text-faint">{r.initiatedBy}</span>,
    },
  ];
  return only ? only.map((id) => all.find((c) => c.id === id)!) : all;
}
