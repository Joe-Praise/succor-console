"use client";

import { buildTimeline } from "@/features/executions/timeline";
import { EventWaterfall } from "@/features/executions/event-views";
import { duration, elapsedMs, tokens, usdPrecise, clockTime } from "@/lib/format";
import { IdChip, KpiCard, StatusTriplet } from "@/components/ops/primitives";
import { PreviewFrame } from "./preview-frame";
import { SAMPLE_RUN } from "./fixtures";

const noop = () => {};

/** The run detail view, drawn by the console's own timeline code from a sample run. */
export function ExecutionPreview({ className }: { className?: string }) {
  const rec = SAMPLE_RUN;
  const events = buildTimeline(rec);
  const delivery = rec.effects[0];
  const usage = rec.usage[0];
  const selected =
    events.find((e) => e.category === "delivery" && e.title.toLowerCase().includes("delivered")) ?? events.at(-1)!;

  return (
    <PreviewFrame
      className={className}
      path="northwind / runs / 6710f3c2…"
      caption="Run detail: a campaign-writer run's job status, agent outcome and callback delivery shown separately, with a timeline of recorded events and the run's cost."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">Campaign Writer</p>
            <IdChip id={rec.job.id} label="Run" />
          </div>
          <StatusTriplet jobStatus={rec.job.status} runStatus={rec.job.runStatus} delivery={delivery} />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard
            label="Elapsed"
            value={duration(elapsedMs(rec.job.createdAt, rec.job.updatedAt))}
            sub="job created → finished"
          />
          <KpiCard
            label="Tokens"
            value={tokens((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.embeddingTokens ?? 0))}
            sub="in · out · embed"
          />
          <KpiCard
            label="Billed"
            value={usdPrecise(usage.billedUsd)}
            sub={`cost ${usdPrecise(usage.estimatedCostUsd)} × ${usage.markupMultiplier}`}
          />
          <KpiCard
            label="Delivery"
            value="Delivered"
            sub={`attempt ${delivery.attempt}/3 · X-Delivery-Id`}
            tone="success"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Timeline · recorded events only</p>
            <EventWaterfall events={events} selectedKey={selected.key} onSelect={noop} />
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-surface p-3 text-xs">
            <p className="font-semibold text-muted-foreground">Selected event</p>
            <p className="text-sm font-medium text-foreground">{selected.title}</p>
            {selected.detail ? <p className="font-mono text-[11px] text-muted-foreground">{selected.detail}</p> : null}
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
              <dt className="text-faint">At</dt>
              <dd className="text-right tabular-nums">{clockTime(selected.at)}</dd>
              <dt className="text-faint">Since start</dt>
              <dd className="text-right tabular-nums">{duration(selected.sinceStartMs)}</dd>
              <dt className="text-faint">Since previous</dt>
              <dd className="text-right tabular-nums">{duration(selected.sincePreviousMs)}</dd>
            </dl>
            <p className="pt-1 text-[11px] leading-relaxed text-faint">
              The job finished before delivery: job status and delivery status are tracked separately.
            </p>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
