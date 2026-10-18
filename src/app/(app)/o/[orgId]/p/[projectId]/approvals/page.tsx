"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckIcon,
  Loader2Icon,
  StampIcon,
  XIcon,
  SparklesIcon,
  ArrowRightIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog } from "@/features/projects/hooks";
import { useApprovals, useDecideApproval } from "@/features/runtime/hooks";
import { useOrgCtx } from "@/features/orgs/org-context";
import { ORG_ROLE_RANK } from "@/lib/permissions";
import type { ApprovalEdit } from "@/api/runtime";
import { ApiError } from "@/api/client";
import type { Approval } from "@/types";
import { PageHeader } from "@/components/page-header";
import { JsonPanel } from "@/components/json-panel";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

const FLOW = [
  { n: "1", title: "Generate", body: "The agent runs and validates its output like any other job." },
  { n: "2", title: "Hold", body: "The tenant-affecting delivery is parked — nothing reaches your API." },
  { n: "3", title: "Decide", body: "An admin approves (optionally editing) or rejects with a note." },
  { n: "4", title: "Deliver or learn", body: "Approve → the worker delivers durably. Reject → the note becomes a style rule." },
];

function ApprovalCard({
  approval,
  canDecide,
  agentName,
  jobHref,
}: {
  approval: Approval;
  canDecide: boolean;
  agentName: string;
  jobHref: string;
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
          toast.error(err instanceof ApiError ? err.message : "Couldn't record the decision"),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-foreground">{agentName}</p>
            <p className="text-xs text-muted-foreground">
              Generated {approval.createdAt ? approval.createdAt.toLocaleString() : "—"} ·{" "}
              <Link href={jobHref} className="font-mono text-brand hover:underline">
                job …{approval.jobId.slice(-8)}
              </Link>
            </p>
          </div>
          {approval.target ? (
            <span className="rounded-md border border-border bg-raised px-2 py-1 font-mono text-[11px] text-muted-foreground">
              will {approval.target.method} {approval.target.path}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {approval.undecodable ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            The held delivery can&apos;t be read (key rotated out or erased), so it can only be
            rejected.
          </div>
        ) : page ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`h1-${approval.jobId}`}>H1</Label>
                <Input
                  id={`h1-${approval.jobId}`}
                  value={fields.h1}
                  readOnly={!canDecide}
                  onChange={(e) => setFields({ ...fields, h1: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`mt-${approval.jobId}`}>Meta title</Label>
                <Input
                  id={`mt-${approval.jobId}`}
                  value={fields.meta_title}
                  readOnly={!canDecide}
                  onChange={(e) => setFields({ ...fields, meta_title: e.target.value })}
                />
                <p className="text-[11px] tabular-nums text-faint">{fields.meta_title.length} / 60</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`md-${approval.jobId}`}>Meta description</Label>
              <Textarea
                id={`md-${approval.jobId}`}
                rows={2}
                value={fields.meta_description}
                readOnly={!canDecide}
                onChange={(e) => setFields({ ...fields, meta_description: e.target.value })}
              />
              <p className="text-[11px] tabular-nums text-faint">{fields.meta_description.length} / 160</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bc-${approval.jobId}`}>Body (HTML — shown as source, never rendered here)</Label>
              <Textarea
                id={`bc-${approval.jobId}`}
                rows={8}
                className="font-mono text-xs"
                value={fields.body_content}
                readOnly={!canDecide}
                onChange={(e) => setFields({ ...fields, body_content: e.target.value })}
              />
            </div>
            {page.faqs && page.faqs.length > 0 ? (
              <details className="rounded-lg border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  {page.faqs.length} FAQs
                </summary>
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
          <JsonPanel value={approval.preview} label="held delivery body" />
        )}

        {canDecide ? (
          <div className="space-y-3 border-t border-border pt-4">
            {mode === "rejecting" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`note-${approval.jobId}`}>Why are you rejecting it?</Label>
                <Textarea
                  id={`note-${approval.jobId}`}
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Never open with a rhetorical question. Keep meta titles under 55 characters."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <p className="flex items-center gap-1.5 text-xs text-faint">
                  <SparklesIcon className="size-3.5 text-brand" aria-hidden />
                  Saved as a durable style rule — future generations for this project read it.
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
                  <Button
                    disabled={decide.isPending || approval.undecodable}
                    onClick={() => submit("approve")}
                  >
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
          </div>
        ) : (
          <p className="border-t border-border pt-4 text-xs text-faint">
            Only project admins and owners can approve or reject.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const { orgId, projectId } = useProjectScope();
  const { role } = useOrgCtx();
  const approvals = useApprovals(projectId);
  const catalog = useCatalog(projectId);

  const canDecide = ORG_ROLE_RANK[role] >= ORG_ROLE_RANK.admin;
  const base = `/o/${orgId}/p/${projectId}`;
  const gatedAgents = (catalog.data?.catalog ?? []).filter((e) => e.riskTier === "high");
  const rows = approvals.data?.approvals ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approvals"
        description="High-risk agents generate, then stop. Nothing reaches your API until an admin signs off."
      />

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map((s) => (
          <li key={s.n} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-xs text-brand">{s.n.padStart(2, "0")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      {gatedAgents.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Gated agents:{" "}
          {gatedAgents.map((e, i) => (
            <span key={e.agentType}>
              <span className="font-mono text-xs text-foreground">{e.agentType}</span>
              {i < gatedAgents.length - 1 ? ", " : ""}
            </span>
          ))}
          . Workflows that include them wait here too.
        </p>
      ) : null}

      {approvals.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : approvals.isError ? (
        <QueryError message="Couldn't load the approval queue." onRetry={() => void approvals.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={StampIcon}
          title="Nothing waiting on you"
          description="When a gated agent finishes, its held delivery shows up here for review."
          action={
            <Button variant="outline" size="sm" render={<Link href={`${base}/jobs`} />}>
              See recent jobs
              <ArrowRightIcon />
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {rows.map((a) => (
            <ApprovalCard
              key={a.jobId}
              approval={a}
              canDecide={canDecide}
              agentName={catalog.data?.catalog.find((e) => e.agentType === a.agentType)?.name ?? a.agentType}
              jobHref={`${base}/jobs/${a.jobId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
