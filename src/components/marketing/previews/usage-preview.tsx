"use client";

import { stackBy, totalsOf } from "@/features/usage/series";
import { compactNumber, percent, usd, usdAxis, usdPrecise } from "@/lib/format";
import { KpiCard } from "@/components/ops/primitives";
import { BreakdownRows } from "@/components/charts/breakdown";
import { TimeChart } from "@/components/charts/time-chart";
import { PreviewFrame } from "./preview-frame";
import { SAMPLE_USAGE } from "./fixtures";

const dayLabel = (p: string) =>
  new Date(p).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Usage & economics, drawn by the console's own series code from sample buckets. */
export function UsagePreview({ className }: { className?: string }) {
  const t = totalsOf(SAMPLE_USAGE);
  const s = stackBy(SAMPLE_USAGE, "agentType", "billedUsd", 4, (k) => k, dayLabel);

  return (
    <PreviewFrame
      className={className}
      path="northwind / usage · last 14 days · by agent"
      caption="Usage and economics: provider cost, billed amount, runs and failure rate, with billed spend per day stacked by agent."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <KpiCard label="Provider cost" value={usd(t.costUsd)} sub="recorded model cost" />
          <KpiCard label="Billed" value={usd(t.billedUsd)} sub="cost × markup" />
          <KpiCard
            label="Billed per run"
            value={usdPrecise(t.billedUsd / t.runs)}
            sub={`${compactNumber(t.runs)} runs`}
          />
          <KpiCard label="Failure rate" value={percent(t.failed / t.runs)} sub="from recorded outcomes" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="tile p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Spend (billed) per day</p>
            <TimeChart ariaLabel="Billed spend per day, stacked by agent" rows={s.data} series={s.series} stacked legend={false} height={180} format={(v) => usd(v)} axisFormat={usdAxis} />
          </div>
          <div className="tile p-3">
            <BreakdownRows rows={s.legend.map((l) => ({ ...l, spark: s.data.map((r) => Number(r[l.key] ?? 0)) }))} format={(v) => usd(v)} share={false} />
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
