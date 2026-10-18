"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { clockTime, duration } from "@/lib/format";
import { TONE_BG } from "@/lib/status";
import { filterTimeline, type TimelineEvent } from "@/features/executions/timeline";
import { useCheckpointOutput } from "@/features/executions/hooks";
import type { ExecutionRecord } from "@/types";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonPanel } from "@/components/json-panel";
import { FactGrid, DeliveryBadge, IdChip } from "@/components/ops/primitives";
import { AnyStatusBadge } from "@/components/ui/status-badge";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "steps", label: "Steps" },
  { key: "delivery", label: "Delivery" },
  { key: "approval", label: "Approval" },
  { key: "errors", label: "Errors" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

/** The left-hand event list (Agent Execution Viewer pattern): search + filters + rows. */
export function EventList({
  events,
  selectedKey,
  onSelect,
}: {
  events: TimelineEvent[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const shown = filterTimeline(events, filter, search);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
            aria-label="Search events"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div role="tablist" aria-label="Event filter" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                filter === f.key ? "bg-raised text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <ol className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Recorded events">
        {shown.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-faint">No events match.</li>
        ) : (
          shown.map((e) => (
            <li key={e.key}>
              <button
                type="button"
                onClick={() => onSelect(e.key)}
                aria-current={selectedKey === e.key ? "true" : undefined}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  selectedKey === e.key
                    ? "border-brand/60 bg-brand-muted"
                    : "border-transparent hover:bg-raised",
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_BG[e.tone])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{e.title}</span>
                  {e.detail ? <span className="block truncate text-[11px] text-muted-foreground">{e.detail}</span> : null}
                  <span className="mt-0.5 block font-mono text-[10px] text-faint">
                    {clockTime(e.at)} · +{duration(e.sinceStartMs)}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}

/**
 * The event "waterfall": each recorded event is a marker on a shared time axis;
 * the faint bar behind it spans the gap since the PREVIOUS recorded event. It is
 * deliberately not drawn as a span — no step start time is recorded.
 */
export function EventWaterfall({
  events,
  selectedKey,
  onSelect,
}: {
  events: TimelineEvent[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const total = Math.max(1, ...events.map((e) => e.sinceStartMs));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="space-y-2">
      <div className="ml-[38%] flex justify-between font-mono text-[10px] text-faint" aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{duration(total * t)}</span>
        ))}
      </div>
      <ol className="space-y-0.5">
        {events.map((e) => {
          const end = (e.sinceStartMs / total) * 100;
          const startMs = e.sincePreviousMs === null ? e.sinceStartMs : e.sinceStartMs - e.sincePreviousMs;
          const start = (startMs / total) * 100;
          return (
            <li key={e.key}>
              <button
                type="button"
                onClick={() => onSelect(e.key)}
                className={cn(
                  "grid w-full grid-cols-[38%_1fr] items-center gap-3 rounded-md px-2 py-1 text-left transition-colors",
                  selectedKey === e.key ? "bg-brand-muted" : "hover:bg-raised",
                )}
              >
                <span className="truncate text-xs text-foreground">{e.title}</span>
                <span className="relative h-4">
                  <span className="absolute inset-y-1.75 right-0 left-0 rounded-full bg-border/60" aria-hidden />
                  <span
                    className="absolute inset-y-1.5 rounded-full bg-raised"
                    style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }}
                    aria-hidden
                  />
                  <span
                    className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface", TONE_BG[e.tone])}
                    style={{ left: `${end}%` }}
                    aria-hidden
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-faint">
        Markers are recorded timestamps. The shaded bar is the time since the previous recorded event — not a
        step duration (step start times aren&apos;t recorded).
      </p>
    </div>
  );
}

function CheckpointInspector({ projectId, jobId, name }: { projectId: string; jobId: string; name: string }) {
  const out = useCheckpointOutput(projectId, jobId, name);
  if (out.isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (out.isError) return <p className="text-sm text-error">Couldn&apos;t load this checkpoint&apos;s output.</p>;
  if (out.data?.outputUndecodable) {
    return <p className="text-sm text-warning">This output is encrypted under a key that is no longer available.</p>;
  }
  return <JsonPanel value={out.data?.output ?? null} label={`checkpoint · ${name}`} empty="This step saved no output." />;
}

/** Details for the selected event, by what it refers to. */
export function EventInspector({
  event,
  record,
  projectId,
  base,
}: {
  event: TimelineEvent | null;
  record: ExecutionRecord;
  projectId: string;
  base: string;
}) {
  if (!event) {
    return <p className="text-sm text-muted-foreground">Select an event to inspect it.</p>;
  }
  const facts = [
    { label: "Recorded at", value: <span className="font-mono text-xs">{clockTime(event.at)}</span> },
    { label: "Since start", value: duration(event.sinceStartMs) },
    {
      label: "Since previous event",
      value: event.sincePreviousMs === null ? "—" : duration(event.sincePreviousMs),
      hint: "Gap between two recorded timestamps — not a measured step duration.",
    },
    { label: "Category", value: <span className="capitalize">{event.category}</span> },
  ];

  const ref = event.ref;
  const checkpointUsage =
    ref?.type === "checkpoint" ? (record.checkpoints.find((c) => c.name === ref.name)?.usage ?? null) : null;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{event.title}</p>
        {event.detail ? <p className="text-sm text-muted-foreground">{event.detail}</p> : null}
      </div>
      <FactGrid facts={facts} />
      {ref?.type === "checkpoint" ? (
        <>
          {checkpointUsage ? (
            <p className="text-xs text-muted-foreground">
              Model usage at this step:{" "}
              <span className="tabular-nums text-foreground">{checkpointUsage.inputTokens ?? 0}</span> input ·{" "}
              <span className="tabular-nums text-foreground">{checkpointUsage.outputTokens ?? 0}</span> output tokens
            </p>
          ) : null}
          <CheckpointInspector projectId={projectId} jobId={record.job.id} name={ref.name} />
        </>
      ) : null}
      {ref?.type === "effect" ? <EffectDetail effect={record.effects.find((x) => x.id === ref.id) ?? null} /> : null}
      {ref?.type === "usage" ? (
        <Link href={`${base}/logs/${ref.id}`} className="text-sm text-brand hover:underline">
          Open the usage record →
        </Link>
      ) : null}
      {ref?.type === "audit" ? (
        <Link href={`${base}/audit/${ref.id}`} className="text-sm text-brand hover:underline">
          Open the audit event →
        </Link>
      ) : null}
    </div>
  );
}

export function EffectDetail({ effect }: { effect: ExecutionRecord["effects"][number] | null }) {
  if (!effect) return null;
  const t = effect.target ?? {};
  const isTool = effect.kind === "mcp.tool";
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {isTool ? <AnyStatusBadge value={effect.status} /> : <DeliveryBadge delivery={effect} />}
        <span className="font-mono text-xs text-muted-foreground">
          {isTool
            ? `${String(t["toolName"] ?? "tool")} · ${String(t["sideEffectClass"] ?? "")}`
            : `${String(t["method"] ?? "")} ${String(t["path"] ?? "")}`}
        </span>
      </div>
      <FactGrid
        facts={[
          { label: "Attempts", value: `${effect.attempt}${isTool ? "" : " / 3"}` },
          { label: "Next attempt", value: effect.nextAttemptAt ? clockTime(effect.nextAttemptAt) : "—" },
          { label: "Outcome unknown", value: effect.outcomeUnknown ? "Yes — may have been received" : "No" },
          { label: isTool ? "Call id" : "X-Delivery-Id", value: <IdChip id={effect.deliveryId} full /> },
        ]}
      />
      {effect.error ? (
        <p className="rounded-md bg-error-bg px-3 py-2 font-mono text-xs wrap-break-word text-error">{effect.error}</p>
      ) : null}
    </div>
  );
}
