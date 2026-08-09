"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useUsage } from "@/features/projects/hooks";
import type { UsageBucket } from "@/types";
import { usd } from "@/features/invoices/invoice-ui";
import { toCsv, download } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Granularity = "day" | "month" | "year";
type GroupBy = "agent" | "model";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const PRESETS: Array<{ key: string; label: string; range: () => { from: string; to: string } }> = [
  { key: "7d", label: "7d", range: () => ({ from: fmt(daysAgo(7)), to: fmt(new Date()) }) },
  { key: "30d", label: "30d", range: () => ({ from: fmt(daysAgo(30)), to: fmt(new Date()) }) },
  { key: "90d", label: "90d", range: () => ({ from: fmt(daysAgo(90)), to: fmt(new Date()) }) },
  { key: "month", label: "This month", range: () => ({ from: fmt(startOfMonth()), to: fmt(new Date()) }) },
];

const STATUS_TONE: Record<string, { text: string; dot: string }> = {
  ok: { text: "text-success", dot: "bg-success" },
  error: { text: "text-error", dot: "bg-error" },
  skipped: { text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

function periodLabel(period: string, granularity: Granularity) {
  const d = new Date(period);
  if (granularity === "day")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (granularity === "month")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
}

/** Collapse period-split buckets into one total row per agent/model. */
function aggregate(buckets: UsageBucket[], groupBy: GroupBy) {
  const map = new Map<
    string,
    { key: string; runs: number; tokens: number; costUsd: number; billedUsd: number }
  >();
  for (const b of buckets) {
    const g = (groupBy === "agent" ? b.agentType : b.model) ?? "unknown";
    const cur = map.get(g) ?? { key: g, runs: 0, tokens: 0, costUsd: 0, billedUsd: 0 };
    cur.runs += b.runs;
    cur.tokens += b.inputTokens + b.outputTokens + b.embeddingTokens;
    cur.costUsd += b.costUsd;
    cur.billedUsd += b.billedUsd;
    map.set(g, cur);
  }
  return [...map.values()].sort((a, b) => b.billedUsd - a.billedUsd);
}

export default function UsagePage() {
  const { projectId } = useProjectScope();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [groupBy, setGroupBy] = useState<GroupBy>("agent");
  const [range, setRange] = useState(() => PRESETS[3].range()); // "This month"
  const [preset, setPreset] = useState("month");

  const usage = useUsage(projectId, { granularity, from: range.from, to: range.to });
  const breakdown = useUsage(projectId, { groupBy, from: range.from, to: range.to });

  const chartData =
    usage.data?.buckets.map((b) => ({
      label: periodLabel(b.period, granularity),
      billed: Number(b.billedUsd.toFixed(4)),
      runs: b.runs,
    })) ?? [];

  const totals = usage.data?.totals;
  const rows = breakdown.data ? aggregate(breakdown.data.buckets, groupBy) : [];

  function setPresetRange(key: string) {
    setPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p) setRange(p.range());
  }
  function setCustom(field: "from" | "to", value: string) {
    setPreset("custom");
    setRange((r) => ({ ...r, [field]: value }));
  }

  function exportCsv() {
    const buckets = usage.data?.buckets ?? [];
    if (buckets.length === 0) return;
    const csv = toCsv(
      ["period", "runs", "inputTokens", "outputTokens", "embeddingTokens", "costUsd", "billedUsd"],
      buckets.map((b) => [
        b.period,
        b.runs,
        b.inputTokens,
        b.outputTokens,
        b.embeddingTokens,
        b.costUsd,
        b.billedUsd,
      ]),
    );
    download(`usage-${projectId}-${range.from}-to-${range.to}.csv`, csv);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="Every run metered — raw provider cost and billed price, side by side."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!usage.data || usage.data.buckets.length === 0}
          >
            <DownloadIcon />
            Export CSV
          </Button>
        }
      />

      {/* toolbar: date range + granularity */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              variant={preset === p.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPresetRange(p.key)}
            >
              {p.label}
            </Button>
          ))}
          <span className="mx-1 text-faint">·</span>
          <Input
            type="date"
            aria-label="From date"
            value={range.from}
            max={range.to}
            onChange={(e) => setCustom("from", e.target.value)}
            className="h-9 w-auto"
          />
          <span className="text-faint">→</span>
          <Input
            type="date"
            aria-label="To date"
            value={range.to}
            min={range.from}
            onChange={(e) => setCustom("to", e.target.value)}
            className="h-9 w-auto"
          />
        </div>

        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* totals */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Runs", value: totals ? String(totals.runs) : null },
          {
            label: "Tokens",
            value: totals
              ? (totals.inputTokens + totals.outputTokens + totals.embeddingTokens).toLocaleString()
              : null,
          },
          { label: "Provider cost", value: totals ? usd(totals.costUsd) : null },
          { label: "Billed", value: totals ? usd(totals.billedUsd) : null },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
            <CardContent>
              {s.value === null ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-medium tabular-nums text-foreground">{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* status breakdown */}
      {totals && Object.keys(totals.statuses).length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Outcomes:</span>
          {Object.entries(totals.statuses).map(([k, v]) => {
            const tone = STATUS_TONE[k] ?? { text: "text-muted-foreground", dot: "bg-muted-foreground" };
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2 py-0.5 text-xs"
              >
                <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
                <span className="text-muted-foreground">{k}</span>
                <span className={cn("font-medium tabular-nums", tone.text)}>{v}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* time series */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Billed per {granularity}</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : usage.isError ? (
            <QueryError message="Couldn't load usage." onRetry={() => void usage.refetch()} />
          ) : chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No runs in this range yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--chart-axis)"
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--chart-axis)"
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--chart-grid)" }}
                    contentStyle={{
                      background: "var(--surface-overlay)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="billed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* breakdown */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-faint">Breakdown</h2>
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <TabsList>
              <TabsTrigger value="agent">By agent</TabsTrigger>
              <TabsTrigger value="model">By model</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {breakdown.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : breakdown.isError ? (
          <QueryError message="Couldn't load the breakdown." onRetry={() => void breakdown.refetch()} />
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === "agent" ? "Agent" : "Model"}</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Provider cost</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="font-mono text-xs">{r.key}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.runs}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {usd(r.costUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usd(r.billedUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No activity in this range.</p>
        )}
      </section>
    </div>
  );
}
