"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeftIcon, ArrowLeftRightIcon, ArrowRightIcon, ArrowUpRightIcon, ChevronRightIcon, RadioIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbacks } from "@/features/projects/hooks";
import { useRuns } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { buildStream, filterStream, type RequestDirection, type StreamEvent, type StreamFilter, isFailure } from "@/features/requests/stream";
import { useUrlFilters } from "@/lib/url-filters";
import { clockTime, dateTime, duration, relativeTime, usdPrecise } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EventHistogram } from "@/components/charts/event-histogram";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { QueryError } from "@/components/query-error";
import { DeliveryBadge, HttpStatus, IdChip, MethodMark } from "@/components/ops/primitives";
import { FilterBar, SearchFilter, SelectFilter } from "@/components/ops/filters";

const FILTER_KEYS = ["direction", "agent", "result", "q"] as const;
const TAIL_MS = 4_000;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-0.5 min-w-0 truncate text-xs text-foreground">{children}</dd>
    </div>
  );
}

function RequestDetail({ event, base, nameOf }: { event: StreamEvent; base: string; nameOf: (a: string) => string }) {
  if (event.direction === "in") {
    const r = event.run;
    return (
      <div className="border-t border-hairline bg-canvas/50 px-3 py-3 pl-[46px]">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Agent">{nameOf(r.agentType)}</Fact>
          <Fact label="Job">
            <IdChip id={r.id} />
          </Fact>
          <Fact label="requestId">{r.requestId ? <span className="font-mono">{r.requestId}</span> : <span className="text-faint">not sent</span>}</Fact>
          <Fact label="Initiated by">
            <span className="font-mono">{r.initiatedBy}</span>
          </Fact>
          <Fact label="Billed">{r.cost ? usdPrecise(r.cost.billedUsd) : "—"}</Fact>
          <Fact label="Attempts">
            {r.attempt}/{r.maxAttempts}
          </Fact>
        </dl>
        {r.lastError ? <p className="mt-3 font-mono text-[11.5px] text-error">{r.lastError}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <Link href={`${base}/runs/${r.id}`} className="inline-flex items-center gap-1 text-brand hover:underline">
            Open run <ArrowRightIcon className="size-3" />
          </Link>
          {r.workflowId ? (
            <Link href={`${base}/workflows/${r.workflowId}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Open workflow <ArrowRightIcon className="size-3" />
            </Link>
          ) : null}
        </div>
      </div>
    );
  }
  const d = event.delivery;
  return (
    <div className="border-t border-hairline bg-canvas/50 px-3 py-3 pl-[46px]">
      <p className="font-mono text-[11.5px] break-all text-foreground">
        {d.method} {d.url}
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Agent">{nameOf(d.agentType)}</Fact>
        <Fact label="Environment">{d.envLabel}</Fact>
        <Fact label="Status">{d.responseStatus ?? "no response"}</Fact>
        <Fact label="Duration">{duration(d.durationMs)}</Fact>
        <Fact label="Attempted">{dateTime(d.ts)}</Fact>
      </dl>
      {d.errorMessage ? <p className="mt-3 font-mono text-[11.5px] text-error">{d.errorMessage}</p> : null}
      {event.id ? (
        <Link href={`${base}/callbacks/${event.id}`} className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline">
          Open delivery <ArrowRightIcon className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}

function RequestRow({
  event,
  open,
  onToggle,
  maxDuration,
  base,
  nameOf,
}: {
  event: StreamEvent;
  open: boolean;
  onToggle: () => void;
  maxDuration: number;
  base: string;
  nameOf: (a: string) => string;
}) {
  const inbound = event.direction === "in";
  return (
    <li className="border-b border-hairline last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "grid w-full grid-cols-[14px_16px_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-1.5 text-left transition-colors hover:bg-raised md:grid-cols-[14px_16px_88px_minmax(0,1fr)_132px_132px_64px]",
          open && "bg-raised",
        )}
      >
        <ChevronRightIcon className={cn("size-3 text-faint transition-transform", open && "rotate-90")} aria-hidden />
        <span title={inbound ? "Request into Succor" : "Callback out to your API"}>
          {inbound ? <ArrowDownLeftIcon className="size-3.5 text-chart-2" aria-label="in" /> : <ArrowUpRightIcon className="size-3.5 text-brand" aria-label="out" />}
        </span>
        <span className="hidden font-mono text-[11px] text-faint tabular-nums md:block" title={dateTime(event.ts)}>
          {clockTime(event.ts)}
        </span>
        <span className="flex min-w-0 items-center font-mono text-xs text-foreground">
          {inbound && !event.http ? <span className="w-10 shrink-0 font-mono text-[11px] text-faint">flow</span> : <MethodMark method={event.method} />}
          <span className="truncate">{event.path}</span>
          {!inbound ? <span className="ml-2 hidden truncate text-[11px] text-faint lg:inline">{event.host}</span> : null}
        </span>
        <span className="hidden min-w-0 md:block">
          {inbound ? <AnyStatusBadge value={event.run.status} /> : <HttpStatus status={event.delivery.responseStatus} ok={event.delivery.ok} />}
        </span>
        <span className="hidden min-w-0 md:block">
          {inbound ? (
            event.run.delivery ? (
              <DeliveryBadge delivery={event.run.delivery} />
            ) : null
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 flex-1 overflow-hidden bg-strong/60" aria-hidden>
                <span className="meter-fill block h-full bg-chart-2" style={{ width: `${Math.max(4, (event.delivery.durationMs / maxDuration) * 100)}%` }} />
              </span>
              <span className="font-mono text-[11px] text-faint tabular-nums">{duration(event.delivery.durationMs)}</span>
            </span>
          )}
        </span>
        <span className="text-right text-[11px] text-faint tabular-nums">{relativeTime(event.ts)}</span>
      </button>
      {open ? <RequestDetail event={event} base={base} nameOf={nameOf} /> : null}
    </li>
  );
}

const TRAFFIC_KINDS = [
  { key: "in" as const, label: "Requests in", color: "var(--chart-2)" },
  { key: "out" as const, label: "Callbacks out", color: "var(--chart-3)" },
  { key: "failed" as const, label: "Failed", color: "var(--error)" },
];

function RequestsStream() {
  const { orgId, projectId } = useProjectScope();
  const { values, set, reset, active } = useUrlFilters(FILTER_KEYS);
  const { nameOf, entries } = useAgentNames(projectId);
  const [tail, setTail] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const tailMs = tail ? TAIL_MS : undefined;
  const runs = useRuns(projectId, { limit: 100 }, { tailMs });
  const callbacks = useCallbacks(projectId, 100, undefined, undefined, { tailMs });
  const base = `/o/${orgId}/p/${projectId}`;

  const events = useMemo(
    () => buildStream(runs.data?.pages[0]?.jobs ?? [], callbacks.data?.deliveries ?? [], entries),
    [runs.data, callbacks.data, entries],
  );
  const filter: StreamFilter = {
    direction: values.direction as RequestDirection | "",
    agent: values.agent,
    result: values.result as StreamFilter["result"],
    query: values.q,
  };
  const shown = filterStream(events, filter);
  const traffic = useMemo(
    () =>
      shown.map((e) => ({
        ts: e.ts.getTime(),
        kind: isFailure(e) ? ("failed" as const) : e.direction === "in" ? ("in" as const) : ("out" as const),
      })),
    [shown],
  );
  const span = traffic.length ? { from: Math.min(...traffic.map((t) => t.ts)), to: Math.max(...traffic.map((t) => t.ts)) } : null;
  const maxDuration = Math.max(1, ...shown.map((e) => (e.direction === "out" ? e.delivery.durationMs : 0)));
  const loading = runs.isLoading || callbacks.isLoading;
  const error = runs.isError || callbacks.isError;

  return (
    <div className="space-y-3">
      <PageHeader
        size="compact"
        title="Requests"
        description="Traffic through this project as it happens: requests accepted from your backend, and callbacks sent back to it."
        action={
          <button
            type="button"
            onClick={() => setTail((v) => !v)}
            aria-pressed={tail}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
              tail ? "border-success/40 bg-success-bg text-success" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tail ? <span className="live-dot size-1.5 rounded-full bg-success" /> : <RadioIcon className="size-3.5" />}
            {tail ? "Live" : "Paused"}
          </button>
        }
      />

      <FilterBar active={active} onClear={reset}>
        <SelectFilter
          label="Direction"
          value={values.direction}
          options={[
            { value: "in", label: "In: requests" },
            { value: "out", label: "Out: callbacks" },
          ]}
          onChange={(v) => set({ direction: v })}
        />
        <SelectFilter
          label="Result"
          value={values.result}
          options={[
            { value: "ok", label: "Healthy" },
            { value: "failed", label: "Failed" },
          ]}
          onChange={(v) => set({ result: v })}
        />
        <SelectFilter label="Agent" value={values.agent} options={entries.map((e) => ({ value: e.agentType, label: e.name }))} onChange={(v) => set({ agent: v })} />
        <SearchFilter value={values.q} placeholder="Path, job or request id" onCommit={(v) => set({ q: v })} />
      </FilterBar>

      {error ? (
        <QueryError
          message="Couldn't load traffic."
          onRetry={() => {
            void runs.refetch();
            void callbacks.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRightIcon}
          title={active ? "No traffic matches these filters" : "No traffic yet"}
          description={active ? "Clear a filter to see more." : "Call an agent from your backend or the playground and it appears here."}
        />
      ) : (
        <>
        {span ? (
          <div className="tile px-3 pt-3 pb-2">
            <EventHistogram ariaLabel="Requests and callbacks over time" events={traffic} kinds={TRAFFIC_KINDS} from={span.from} to={span.to} timeLabel={(t) => dateTime(new Date(t))} />
          </div>
        ) : null}
        <div className="tile overflow-hidden">
          <div className="hidden grid-cols-[14px_16px_88px_minmax(0,1fr)_132px_132px_64px] gap-x-2 border-b border-border px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-faint uppercase md:grid">
            <span />
            <span />
            <span>Time</span>
            <span>Request</span>
            <span>Status</span>
            <span>Result</span>
            <span className="text-right">Age</span>
          </div>
          <ul>
            {shown.map((e) => (
              <RequestRow
                key={e.key}
                event={e}
                open={openKey === e.key}
                onToggle={() => setOpenKey((k) => (k === e.key ? null : e.key))}
                maxDuration={maxDuration}
                base={base}
                nameOf={nameOf}
              />
            ))}
          </ul>
        </div>
        </>
      )}

      <p className="text-xs text-faint">
        Showing the latest 100 of each. Only accepted requests are recorded: one refused before it became a job (400, 401, 402, 403) leaves no trace
        here. <span className="font-mono">flow</span> marks a job a workflow started directly, with no inbound request. Callback attempts are kept for 30
        days.
      </p>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RequestsStream />
    </Suspense>
  );
}
