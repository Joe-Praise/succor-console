"use client";

import { useState } from "react";
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
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function periodLabel(period: string, granularity: Granularity) {
  const d = new Date(period);
  if (granularity === "day")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (granularity === "month")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
}

export default function UsagePage() {
  const { projectId } = useProjectScope();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const usage = useUsage(projectId, { granularity });
  const byAgent = useUsage(projectId, { granularity: "month", groupBy: "agent" });

  const chartData =
    usage.data?.buckets.map((b) => ({
      label: periodLabel(b.period, granularity),
      billed: Number(b.billedUsd.toFixed(4)),
      runs: b.runs,
    })) ?? [];

  const totals = usage.data?.totals;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="Every run metered — raw provider cost and billed price, side by side."
        action={
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

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

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Billed per {granularity}</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.isLoading ? (
            <Skeleton className="h-64 w-full" />
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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">This month by agent</h2>
        {byAgent.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : byAgent.data && byAgent.data.buckets.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Provider cost</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byAgent.data.buckets.map((b) => (
                  <TableRow key={`${b.period}-${b.agentType}`}>
                    <TableCell className="font-mono text-xs">{b.agentType}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.runs}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(b.inputTokens + b.outputTokens + b.embeddingTokens).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {usd(b.costUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usd(b.billedUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No agent activity this month.</p>
        )}
      </section>
    </div>
  );
}
