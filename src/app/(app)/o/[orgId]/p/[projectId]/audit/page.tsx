"use client";

import { useState } from "react";
import Link from "next/link";
import { FingerprintIcon, Loader2Icon, ShieldCheckIcon, XIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useAuditEvents } from "@/features/governance/hooks";
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, AUDIT_TARGET_TYPES, type AuditEvent } from "@/types";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_COPY: Record<string, string> = {
  "approval.approve": "Approved a held delivery",
  "approval.reject": "Rejected a held delivery",
  "retention.erase": "Erased protected payloads (retention)",
  "effect.requeue": "Re-queued a failed side effect",
  "audit.repair": "Repaired a malformed audit row",
};

const ALL = "__all";

function FilterSelect({
  label,
  value,
  options,
  onChange,
  format = (v: string) => v,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) {
  const items = { [ALL]: `Any ${label.toLowerCase()}`, ...Object.fromEntries(options.map((o) => [o, format(o)])) };
  return (
    <Select value={value || ALL} items={items} onValueChange={(v) => onChange(v === ALL || v == null ? "" : String(v))}>
      <SelectTrigger size="sm" className="min-w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{items[ALL]}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {format(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Details({ e }: { e: AuditEvent }) {
  const bits: string[] = [];
  if (e.category) bits.push(e.category);
  if (e.counts) for (const [k, v] of Object.entries(e.counts)) bits.push(`${k}: ${v}`);
  if (e.noteLength != null) bits.push(`note · ${e.noteLength} chars`);
  return bits.length ? <span className="text-xs text-muted-foreground">{bits.join(" · ")}</span> : <span className="text-faint">—</span>;
}

export default function AuditPage() {
  const { orgId, projectId } = useProjectScope();
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [targetType, setTargetType] = useState("");
  const filters = {
    action: action || undefined,
    outcome: outcome || undefined,
    targetType: targetType || undefined,
  };
  const audit = useAuditEvents(projectId, filters);
  const events = audit.data?.pages.flatMap((p) => p.events) ?? [];
  const filtered = !!(action || outcome || targetType);
  const base = `/o/${orgId}/p/${projectId}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit"
        description="Every human decision and privileged operation on this project, signed the moment it's written."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <FingerprintIcon className="size-4 text-brand" />
          <p className="mt-2 text-sm font-medium text-foreground">Append-only, signed rows</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Each row carries an HMAC over its contents. Rows are only ever inserted — no edit, no delete
            path exists in the service.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <ShieldCheckIcon className="size-4 text-brand" />
          <p className="mt-2 text-sm font-medium text-foreground">Deletion shows up</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sealed checkpoints count and digest closed time ranges, so a missing row surfaces in the
            platform&apos;s scheduled integrity sweep.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">What this view is — and isn&apos;t</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            This is the data. Signatures are verified server-side by the platform operator, never in
            your browser, and prose (like reviewer notes) is never stored here — only its length.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Action" value={action} options={AUDIT_ACTIONS} onChange={setAction} format={(a) => ACTION_COPY[a] ?? a} />
        <FilterSelect label="Outcome" value={outcome} options={AUDIT_OUTCOMES} onChange={setOutcome} />
        <FilterSelect label="Target" value={targetType} options={AUDIT_TARGET_TYPES} onChange={setTargetType} />
        {filtered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAction("");
              setOutcome("");
              setTargetType("");
            }}
          >
            <XIcon />
            Clear
          </Button>
        ) : null}
      </div>

      {audit.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : audit.isError ? (
        <QueryError message="Couldn't load the audit ledger." onRetry={() => void audit.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={FingerprintIcon}
          title={filtered ? "No events match these filters" : "No audit events yet"}
          description="Approvals, rejections, retention erasures and operator repairs are recorded here as they happen."
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) =>
                  e.unreadable ? (
                    <TableRow key={e.id}>
                      <TableCell colSpan={6} className="text-xs text-warning">
                        Row {e.id} couldn&apos;t be read — it&apos;s kept, and flagged for the operator.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {e.ts ? e.ts.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="max-w-44 truncate font-mono text-xs" title={e.actor}>
                        {e.actor}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-foreground">{ACTION_COPY[e.action ?? ""] ?? e.action}</span>
                        {e.agentType ? (
                          <span className="block font-mono text-[11px] text-faint">{e.agentType}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <AnyStatusBadge value={e.outcome} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.targetType === "agentJob" && e.targetId ? (
                          <Link href={`${base}/jobs/${e.targetId}`} className="text-brand hover:underline">
                            job …{e.targetId.slice(-8)}
                          </Link>
                        ) : e.targetType === "workflow" && e.targetId ? (
                          <Link href={`${base}/workflows/${e.targetId}`} className="text-brand hover:underline">
                            workflow …{e.targetId.slice(-8)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {e.targetType} …{e.targetId?.slice(-8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Details e={e} />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
          {audit.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={audit.isFetchingNextPage}
                onClick={() => void audit.fetchNextPage()}
              >
                {audit.isFetchingNextPage ? <Loader2Icon className="animate-spin" /> : null}
                Load older events
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-faint">Start of the ledger for this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
