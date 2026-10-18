"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon, XIcon, SparklesIcon, ArrowUpRightIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useDecideApproval } from "@/features/runtime/hooks";
import { useExecution } from "@/features/executions/hooks";
import type { ApprovalEdit } from "@/api/runtime";
import { ApiError } from "@/api/client";
import type { Approval } from "@/types";
import { cn } from "@/lib/utils";
import { dateTime, relativeTime, usdPrecise } from "@/lib/format";
import { JsonPanel } from "@/components/json-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Callout, IdChip } from "@/components/ops/primitives";

/** The editable shape the backend accepts (seo-page content fields). */
interface PagePreview {
  h1?: string;
  meta_title?: string;
  meta_description?: string;
  body_content?: string;
  faqs?: Array<{ question: string; answer: string }>;
  generation_note?: string | null;
}

function asPagePreview(v: unknown): PagePreview | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  return typeof o.h1 === "string" || typeof o.body_content === "string" ? (o as PagePreview) : null;
}

function ColumnHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** What the agent was asked — from the execution record, never re-derived. */
function InputColumn({ jobId }: { jobId: string }) {
  const { projectId } = useProjectScope();
  const exec = useExecution(projectId, jobId);
  if (exec.isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (exec.isError || !exec.data)
    return <Callout tone="warning">Couldn&apos;t load this run&apos;s input. The decision doesn&apos;t depend on it.</Callout>;
  if (exec.data.job.inputUndecodable)
    return <Callout tone="warning">The input is encrypted under a key that is no longer available.</Callout>;
  return <JsonPanel value={exec.data.job.input ?? null} label="input" maxHeight="max-h-[460px]" empty="No stored input." />;
}

/** Run context strip: outcome, attempts, spend so far — all from the execution record. */
function RunContext({ jobId }: { jobId: string }) {
  const { projectId } = useProjectScope();
  const exec = useExecution(projectId, jobId);
  const rec = exec.data;
  if (!rec) return null;
  const billed = rec.usage.reduce((s, r) => s + (r.billedUsd ?? 0), 0);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        Validation <AnyStatusBadge value={rec.job.runStatus ?? "unknown"} />
      </span>
      <span>
        Attempt {rec.job.attempt ?? 0}/{rec.job.maxAttempts ?? "—"}
      </span>
      <span>{rec.checkpoints.length} steps committed</span>
      <span>Billed so far {usdPrecise(billed)}</span>
    </div>
  );
}

export function ApprovalCard({
  approval,
  canDecide,
  agentName,
  runHref,
  focused,
}: {
  approval: Approval;
  canDecide: boolean;
  agentName: string;
  runHref: string;
  focused?: boolean;
}) {
  const { projectId } = useProjectScope();
  const decide = useDecideApproval(projectId);
  const page = asPagePreview(approval.preview);

  const [fields, setFields] = useState({
    h1: page?.h1 ?? "",
    meta_title: page?.meta_title ?? "",
    meta_description: page?.meta_description ?? "",
    body_content: page?.body_content ?? "",
  });
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [now] = useState(() => Date.now());

  const edit: ApprovalEdit = {};
  if (page) {
    for (const k of Object.keys(fields) as Array<keyof typeof fields>) {
      if (fields[k] !== (page[k] ?? "") && fields[k].trim()) edit[k] = fields[k];
    }
  }
  const edited = Object.keys(edit).length > 0;

  function submit(decision: "approve" | "reject") {
    decide.mutate(
      {
        jobId: approval.jobId,
        decision,
        note: note.trim() || undefined,
        edit: decision === "approve" && edited ? edit : undefined,
      },
      {
        onSuccess: () =>
          toast.success(
            decision === "approve"
              ? "Approved — the worker is delivering it now."
              : note.trim()
                ? "Rejected — your note was saved as a style rule."
                : "Rejected — the delivery was discarded.",
          ),
        onError: (err) =>
          toast.error(
            err instanceof ApiError && err.status === 409
              ? "Someone already decided this one — the queue has been refreshed."
              : err instanceof ApiError
                ? err.message
                : "Couldn't record the decision",
          ),
      },
    );
  }

  const field = (id: string) => `${id}-${approval.jobId}`;

  return (
    <article
      id={`approval-${approval.jobId}`}
      className={cn(
        "scroll-mt-24 rounded-xl border border-border bg-surface",
        focused && "border-brand/60 ring-2 ring-brand/20",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{agentName}</p>
            <IdChip id={approval.jobId} label="Run" />
            <Link href={runHref} className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline">
              Open run <ArrowUpRightIcon className="size-3" aria-hidden />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground" title={dateTime(approval.createdAt)}>
            Held {approval.createdAt ? relativeTime(approval.createdAt, now) : "—"}
          </p>
          <RunContext jobId={approval.jobId} />
        </div>
        {approval.target ? (
          <span className="rounded-md border border-border bg-raised px-2 py-1 font-mono text-[11px] text-muted-foreground">
            on approve → {approval.target.method} {approval.target.path}
          </span>
        ) : null}
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0">
          <ColumnHead title="Input" hint="What the agent was asked, after validation and defaults." />
          <InputColumn jobId={approval.jobId} />
        </div>

        <div className="min-w-0">
          <ColumnHead
            title="Proposed delivery"
            hint={canDecide && page ? "Edit any field before approving — edits are what gets delivered." : "The held body, exactly as it would be sent."}
          />
          {approval.undecodable ? (
            <Callout tone="warning">
              The held delivery can&apos;t be read (key rotated out or erased), so it can only be rejected.
            </Callout>
          ) : page ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={field("h1")}>H1</Label>
                  <Input
                    id={field("h1")}
                    value={fields.h1}
                    readOnly={!canDecide}
                    onChange={(e) => setFields({ ...fields, h1: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={field("mt")}>Meta title</Label>
                  <Input
                    id={field("mt")}
                    value={fields.meta_title}
                    readOnly={!canDecide}
                    onChange={(e) => setFields({ ...fields, meta_title: e.target.value })}
                  />
                  <p className={cn("text-[11px] tabular-nums", fields.meta_title.length > 60 ? "text-warning" : "text-faint")}>
                    {fields.meta_title.length} / 60
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={field("md")}>Meta description</Label>
                <Textarea
                  id={field("md")}
                  rows={2}
                  value={fields.meta_description}
                  readOnly={!canDecide}
                  onChange={(e) => setFields({ ...fields, meta_description: e.target.value })}
                />
                <p className={cn("text-[11px] tabular-nums", fields.meta_description.length > 160 ? "text-warning" : "text-faint")}>
                  {fields.meta_description.length} / 160
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={field("bc")}>Body (HTML — shown as source, never rendered here)</Label>
                <Textarea
                  id={field("bc")}
                  rows={8}
                  className="font-mono text-xs"
                  value={fields.body_content}
                  readOnly={!canDecide}
                  onChange={(e) => setFields({ ...fields, body_content: e.target.value })}
                />
              </div>
              {page.faqs && page.faqs.length > 0 ? (
                <details className="rounded-lg border border-border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">{page.faqs.length} FAQs</summary>
                  <dl className="mt-3 space-y-3">
                    {page.faqs.map((f, i) => (
                      <div key={i}>
                        <dt className="text-sm font-medium text-foreground">{f.question}</dt>
                        <dd className="text-sm text-muted-foreground">{f.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
              {page.generation_note ? (
                <p className="rounded-lg bg-raised px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Agent note:</span> {page.generation_note}
                </p>
              ) : null}
            </div>
          ) : (
            <JsonPanel value={approval.preview} label="held delivery body" maxHeight="max-h-[460px]" />
          )}
        </div>
      </div>

      {canDecide ? (
        <footer className="space-y-3 border-t border-border px-5 py-4">
          {mode === "rejecting" ? (
            <div className="space-y-1.5">
              <Label htmlFor={field("note")}>Why are you rejecting it?</Label>
              <Textarea
                id={field("note")}
                rows={2}
                maxLength={2000}
                placeholder="e.g. Never open with a rhetorical question. Keep meta titles under 55 characters."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="flex items-center gap-1.5 text-xs text-faint">
                <SparklesIcon className="size-3.5 text-brand" aria-hidden />
                Saved as a durable style rule — future generations for this project read it. The ledger records only its length.
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {mode === "rejecting" ? (
              <>
                <Button variant="destructive" disabled={decide.isPending} onClick={() => submit("reject")}>
                  {decide.isPending ? <Loader2Icon className="animate-spin" /> : <XIcon />}
                  Reject and discard
                </Button>
                <Button variant="ghost" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button disabled={decide.isPending || approval.undecodable} onClick={() => submit("approve")}>
                  {decide.isPending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  {edited ? "Approve with edits" : "Approve and deliver"}
                </Button>
                <Button variant="outline" onClick={() => setMode("rejecting")}>
                  Reject…
                </Button>
                {edited ? (
                  <span className="text-xs text-faint">
                    {Object.keys(edit).length} field{Object.keys(edit).length === 1 ? "" : "s"} edited
                  </span>
                ) : null}
              </>
            )}
          </div>
        </footer>
      ) : (
        <p className="border-t border-border px-5 py-3 text-xs text-faint">Only project admins and owners can approve or reject.</p>
      )}
    </article>
  );
}
