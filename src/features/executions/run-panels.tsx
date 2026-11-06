"use client";

import Link from "next/link";
import { DownloadIcon } from "lucide-react";

import { usdPrecise, tokens, duration, dateTime, shortId } from "@/lib/format";
import { callbackEffects } from "@/features/executions/diagnostics";
import { EffectDetail } from "@/features/executions/event-views";
import type { ExecutionRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { JsonPanel } from "@/components/json-panel";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Callout } from "@/components/ops/primitives";
import { DataTable } from "@/components/ops/data-table";

function download(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** The run's stored result. Rendered as data — HTML in it is never rendered. */
export function OutputPanel({ record }: { record: ExecutionRecord }) {
  const { job } = record;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          Validation outcome:{" "}
          {job.runStatus ? <AnyStatusBadge value={job.runStatus} /> : <span className="text-faint">not yet</span>}
        </p>
        <Button
          variant="outline"
          size="xs"
          disabled={job.result === null || job.result === undefined}
          onClick={() => download(`run-${job.id}-result.json`, job.result)}
        >
          <DownloadIcon />
          Download JSON
        </Button>
      </div>
      {job.resultUndecodable ? (
        <Callout tone="warning">
          This result is encrypted under a key that is no longer available, so it can&apos;t be shown. Everything
          else about the run is still accurate.
        </Callout>
      ) : (
        <JsonPanel
          value={job.result ?? null}
          label="result"
          maxHeight="max-h-[520px]"
          empty={
            job.status === "queued" || job.status === "running"
              ? "Still running — the result appears when the job settles."
              : "No stored result (none produced, or erased by retention)."
          }
        />
      )}
    </div>
  );
}

/** The validated request body the job was created from. */
export function InputPanel({ record }: { record: ExecutionRecord }) {
  const { job } = record;
  return job.inputUndecodable ? (
    <Callout tone="warning">This input is encrypted under a key that is no longer available.</Callout>
  ) : (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        The request body after validation and defaults — exactly what the agent received.
      </p>
      <JsonPanel value={job.input ?? null} label="input" maxHeight="max-h-[520px]" empty="No stored input." />
    </div>
  );
}

/** Every priced row for this run, with what is and isn't in the number. */
export function CostPanel({ record, base }: { record: ExecutionRecord; base: string }) {
  const rows = record.usage;
  const cost = rows.reduce((s, r) => s + (r.estimatedCostUsd ?? 0), 0);
  const billed = rows.reduce((s, r) => s + (r.billedUsd ?? 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-faint">Provider cost (recorded)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{usdPrecise(cost)}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-faint">Billed to you</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{usdPrecise(billed)}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-faint">Priced rows</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{rows.length}</p>
        </div>
      </div>
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `${base}/logs/${r.id}`}
        getRowLabel={(r) => `Open usage record ${r.id}`}
        empty={
          <p className="rounded-lg border border-dashed border-strong px-4 py-6 text-center text-sm text-muted-foreground">
            No priced rows yet — a run is metered once, when it reaches its final state.
          </p>
        }
        columns={[
          { id: "ts", header: "Recorded", cell: (r) => <span className="text-muted-foreground">{dateTime(r.ts)}</span> },
          { id: "model", header: "Model", cell: (r) => <span className="font-mono text-xs">{r.model}</span> },
          {
            id: "tokens",
            header: "Tokens (in / out / emb)",
            align: "right",
            cell: (r) => `${tokens(r.inputTokens)} / ${tokens(r.outputTokens)} / ${tokens(r.embeddingTokens)}`,
          },
          { id: "cost", header: "Provider cost", align: "right", cell: (r) => usdPrecise(r.estimatedCostUsd) },
          {
            id: "markup",
            header: "Markup",
            align: "right",
            cell: (r) => (r.markupMultiplier ? `×${r.markupMultiplier}` : "—"),
          },
          { id: "billed", header: "Billed", align: "right", cell: (r) => usdPrecise(r.billedUsd) },
          { id: "pv", header: "Pricing", cell: (r) => <span className="font-mono text-[11px] text-faint">{r.pricingVersion ?? "—"}</span> },
        ]}
      />
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>• Provider cost combines chat and embedding tokens at the recorded pricing version; the split isn&apos;t stored.</li>
        <li>• Tool calls, infrastructure and callback delivery are not metered.</li>
        <li>
          • A run is billed once, at its final state — retries inside it aren&apos;t billed again. An approval-gated run can
          have a second row when the approved output is indexed for duplicate detection.
        </li>
      </ul>
    </div>
  );
}

/** Callback deliveries (separate from the run's own outcome) and tool calls. */
export function DeliveryPanel({ record, base }: { record: ExecutionRecord; base: string }) {
  const callbacks = callbackEffects(record);
  const tools = record.effects.filter((e) => e.kind === "mcp.tool");
  return (
    <div className="space-y-5">
      {record.job.status === "succeeded" && callbacks.some((c) => c.status !== "succeeded") ? (
        <Callout tone="warning" title="The run succeeded; its delivery did not (yet)">
          Execution and delivery are tracked separately. The result is safe on this page even when your endpoint
          didn&apos;t accept it.
        </Callout>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Callbacks</h3>
        {callbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No callback was recorded for this run (playground runs, suppressed callbacks, or nothing to deliver).
          </p>
        ) : (
          callbacks.map((e) => <EffectDetail key={e.id} effect={e} />)
        )}
        <p className="text-xs text-faint">
          Each HTTP attempt (status code, URL, duration) is listed on{" "}
          <Link href={`${base}/callbacks?agent=${record.job.agentType}`} className="text-brand hover:underline">
            Callbacks
          </Link>
          . Linking those attempts to this run isn&apos;t recorded yet.
        </p>
      </div>
      {tools.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Tool calls</h3>
          {tools.map((e) => (
            <EffectDetail key={e.id} effect={e} />
          ))}
          <p className="text-xs text-faint">Tool arguments and results are never echoed back by the API.</p>
        </div>
      ) : null}
    </div>
  );
}

/** Governance rows that name this run (approvals today). */
export function AuditPanel({ record, base }: { record: ExecutionRecord; base: string }) {
  return (
    <DataTable
      rows={record.audit.filter((a) => !a.unreadable)}
      getRowKey={(a) => a.id}
      getRowHref={(a) => `${base}/audit/${a.id}`}
      getRowLabel={(a) => `Open audit event ${a.id}`}
      empty={<p className="text-sm text-muted-foreground">No governance events reference this run.</p>}
      columns={[
        { id: "ts", header: "When", cell: (a) => <span className="text-muted-foreground">{dateTime(a.ts)}</span> },
        { id: "action", header: "Action", cell: (a) => <span className="font-mono text-xs">{a.action}</span> },
        { id: "outcome", header: "Outcome", cell: (a) => <AnyStatusBadge value={a.outcome} /> },
        { id: "actor", header: "Actor", cell: (a) => <span className="font-mono text-[11px] text-faint">{a.actor}</span> },
        {
          id: "note",
          header: "Note",
          align: "right",
          cell: (a) => (a.noteLength != null ? `${a.noteLength} chars` : "—"),
        },
      ]}
    />
  );
}

/** Identifiers + related records, for the right rail. */
export function RunIdentifiers({ record, base }: { record: ExecutionRecord; base: string }) {
  const { job } = record;
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Job ID", value: <span className="font-mono text-xs">{job.id}</span> },
    { label: "Request ID", value: job.requestId ? <span className="font-mono text-xs">{job.requestId}</span> : "—" },
    {
      label: "Workflow",
      value: job.workflowId ? (
        <Link href={`${base}/workflows/${job.workflowId}`} className="font-mono text-xs text-brand hover:underline">
          {shortId(job.workflowId)}
        </Link>
      ) : (
        "—"
      ),
    },
    { label: "Initiated by", value: <span className="font-mono text-xs break-all">{job.initiatedBy}</span> },
    { label: "Created", value: dateTime(job.createdAt) },
    { label: "Last state change", value: dateTime(job.updatedAt) },
    ...(job.reviewedAt
      ? [{ label: "Reviewed", value: `${dateTime(job.reviewedAt)}${job.reviewedBy ? ` · ${shortId(job.reviewedBy)}` : ""}` }]
      : []),
  ];
  return (
    <div className="space-y-4 tile p-4">
      <p className="text-xs font-semibold tracking-wide text-faint uppercase">Identifiers</p>
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="space-y-0.5">
            <dt className="text-[11px] text-faint">{r.label}</dt>
            <dd className="text-sm text-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1.5 border-t border-border pt-3 text-sm">
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">Related</p>
        <Link href={`${base}/logs?job=${job.id}`} className="block text-brand hover:underline">
          Usage records for this run
        </Link>
        <Link href={`${base}/runs?agent=${job.agentType}`} className="block text-brand hover:underline">
          Other runs of this agent
        </Link>
        <Link href={`${base}/agents/${job.agentType}`} className="block text-brand hover:underline">
          Agent contract
        </Link>
      </div>
      {job.lastError ? (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Last error</p>
          <p className="rounded-md bg-error-bg px-2.5 py-2 font-mono text-[11px] wrap-break-word text-error">{job.lastError}</p>
        </div>
      ) : null}
      <p className="border-t border-border pt-3 text-[11px] text-faint">
        Elapsed is measured from job creation to its last recorded state change ({duration(
          new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime(),
        )}).
      </p>
    </div>
  );
}
