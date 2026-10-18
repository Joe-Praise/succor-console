"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActivityIcon,
  ArrowRightIcon,
  HistoryIcon,
  RepeatIcon,
  SearchIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useLogs } from "@/features/projects/hooks";
import { useApprovals } from "@/features/runtime/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LogRow {
  _id?: string;
  ts?: string;
  agentType?: string;
  status?: string;
  billedUsd?: number | null;
  durationMs?: number | null;
  jobId?: string | null;
  toolCalls?: number | null;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** What "durable" buys you — stated once, in the place people look for job state. */
const GUARANTEES = [
  {
    icon: TimerIcon,
    title: "Leased, not fire-and-forget",
    body: "A worker leases each job for 30s and heartbeats every 10s. If the process dies, the lease lapses and another worker reclaims it.",
  },
  {
    icon: HistoryIcon,
    title: "Checkpointed per step",
    body: "Each model step's output is saved. A retry replays finished steps instead of paying for them twice.",
  },
  {
    icon: RepeatIcon,
    title: "Retried with backoff",
    body: "Each agent has its own run budget (SEO Page Factory: 3 attempts). Callback deliveries retry up to 3× at 5s × 2ⁿ, capped at 5 min. Exhausted → dead-lettered.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Billed exactly once",
    body: "The run is metered at a single fenced terminal write, so a reclaimed lease can't double-bill.",
  },
];

export default function JobsPage() {
  const { orgId, projectId } = useProjectScope();
  const router = useRouter();
  const logs = useLogs(projectId, 100);
  const approvals = useApprovals(projectId);
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);

  const base = `/o/${orgId}/p/${projectId}`;

  // The run log is written at each job's terminal, so it doubles as the recent-jobs
  // index (there is no tenant "list jobs" endpoint). Deduped — one row per job.
  const seen = new Set<string>();
  const recent = ((logs.data ?? []) as LogRow[]).filter((r) => {
    if (!r.jobId || seen.has(r.jobId)) return false;
    seen.add(r.jobId);
    return true;
  });
  const waiting = approvals.data?.approvals.length ?? 0;

  function open(e: React.FormEvent) {
    e.preventDefault();
    const id = lookup.trim();
    if (!OBJECT_ID.test(id)) {
      setLookupError("A job ID is the 24-character id returned in the 202 response.");
      return;
    }
    router.push(`${base}/jobs/${id}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jobs"
        description="Every agent call is a durable job. Look one up, or follow the latest from your run log."
      />

      <form onSubmit={open} className="flex max-w-xl flex-col gap-2 sm:flex-row" noValidate>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={lookup}
            onChange={(e) => {
              setLookup(e.target.value);
              setLookupError(null);
            }}
            placeholder="Paste a jobId from a 202 response"
            className="pl-9 font-mono text-xs"
            aria-invalid={!!lookupError}
            aria-label="Job ID"
          />
        </div>
        <Button type="submit">
          Open job
          <ArrowRightIcon />
        </Button>
      </form>
      {lookupError ? <p className="-mt-6 text-xs text-error">{lookupError}</p> : null}

      {waiting > 0 ? (
        <Link
          href={`${base}/approvals`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-warning-bg px-4 py-3 text-sm text-warning transition-colors hover:border-strong"
        >
          <span>
            <span className="font-medium">
              {waiting} job{waiting === 1 ? " is" : "s are"} parked for human review.
            </span>{" "}
            Their output is generated; delivery waits on an admin.
          </span>
          <ArrowRightIcon className="size-4 shrink-0" />
        </Link>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Recent jobs</h2>
        {logs.isLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : logs.isError ? (
          <QueryError message="Couldn't load recent jobs." onRetry={() => void logs.refetch()} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No finished jobs yet"
            description="Call an agent and its job lands here once it settles. In-flight jobs are reachable by ID."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finished</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead className="text-right">Tools</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Job</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.jobId!}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.ts ? new Date(r.ts).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.agentType ?? "—"}</TableCell>
                    <TableCell>
                      <AnyStatusBadge value={r.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.toolCalls ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.billedUsd != null ? usd(r.billedUsd) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`${base}/jobs/${r.jobId}`}
                        className="font-mono text-xs text-brand hover:underline"
                      >
                        …{r.jobId!.slice(-8)}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">What &ldquo;durable&rdquo; means here</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="rounded-xl border border-border bg-surface p-4">
              <g.icon className="size-4 text-brand" aria-hidden />
              <p className="mt-2 text-sm font-medium text-foreground">{g.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
