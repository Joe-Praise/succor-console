"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleDotIcon,
  GitForkIcon,
  Loader2Icon,
  PlayIcon,
  ScaleIcon,
  WorkflowIcon,
  ChevronRightIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog } from "@/features/projects/hooks";
import { useStartWorkflow, useWorkflows } from "@/features/runtime/hooks";
import { WORKFLOW_BY_TYPE, WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/features/runtime/workflow-templates";
import { RoleGate } from "@/features/orgs/org-context";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/types";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KIND_ICON = { single: CircleDotIcon, fanout: GitForkIcon, gate: ScaleIcon } as const;

const STEP_TONE: Record<string, string> = {
  succeeded: "bg-success",
  running: "bg-info animate-pulse",
  critiquing: "bg-info animate-pulse",
  paused: "bg-warning",
  failed: "bg-error",
  pending: "bg-border",
};

/** One segment per step, colored by that step's state. */
function StepProgress({ wf }: { wf: Workflow }) {
  return (
    <div className="flex w-full gap-1" aria-label={`Step ${wf.currentStep + 1} of ${wf.steps.length}`}>
      {wf.steps.map((s) => (
        <span key={s.name} className={cn("h-1.5 flex-1 rounded-full", STEP_TONE[s.status] ?? "bg-border")} />
      ))}
    </div>
  );
}

function StartDialog({
  template,
  onOpenChange,
}: {
  template: WorkflowTemplate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { orgId, projectId } = useProjectScope();
  const router = useRouter();
  const start = useStartWorkflow(projectId);
  const catalog = useCatalog(projectId);
  const [body, setBody] = useState<string | null>(null);
  const text = body ?? (template ? JSON.stringify(template.exampleInput, null, 2) : "");

  const missing = template
    ? template.steps.filter(
        (s) => catalog.data?.catalog.find((e) => e.agentType === s.agentType)?.enabledForProject === false,
      )
    : [];

  function submit() {
    if (!template) return;
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      toast.error("The input isn't valid JSON");
      return;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      toast.error("The input must be a JSON object");
      return;
    }
    start.mutate(
      { workflowType: template.workflowType, input: input as Record<string, unknown> },
      {
        onSuccess: (r) => {
          toast.success("Workflow started");
          onOpenChange(false);
          setBody(null);
          router.push(`/o/${orgId}/p/${projectId}/workflows/${r.workflowId}`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't start the workflow"),
      },
    );
  }

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start “{template?.name}”</DialogTitle>
          <DialogDescription>
            The body is the workflow&apos;s input. Every step it spawns is a metered, durable job.
          </DialogDescription>
        </DialogHeader>
        {template ? (
          <div className="space-y-4">
            <ul className="space-y-1 rounded-lg bg-raised px-4 py-3 text-xs text-muted-foreground">
              {template.prerequisites.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
            {missing.length > 0 ? (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
                Not enabled for direct calls on this project:{" "}
                {missing.map((m) => m.agentType).join(", ")}. Workflow steps don&apos;t pass through
                the per-call enablement and budget guards, so only start this if you mean to run them.
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="wf-input">Input (JSON)</Label>
              <Textarea
                id="wf-input"
                rows={16}
                spellCheck={false}
                className="font-mono text-xs"
                value={text}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBody(null)}>
                Reset to example
              </Button>
              <Button onClick={submit} disabled={start.isPending}>
                {start.isPending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
                Start workflow
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowsPage() {
  const { orgId, projectId } = useProjectScope();
  const workflows = useWorkflows(projectId);
  const [starting, setStarting] = useState<WorkflowTemplate | null>(null);
  const base = `/o/${orgId}/p/${projectId}`;
  const rows = workflows.data?.workflows ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Workflows"
        description="Multi-agent pipelines as durable graphs. A crash mid-run resumes without repeating a step or spending twice."
      />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-faint">Available pipelines</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {WORKFLOW_TEMPLATES.map((t) => (
            <div key={t.workflowType} className="flex flex-col rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="font-mono text-xs text-faint">{t.workflowType}</p>
                </div>
                <RoleGate min="admin">
                  <Button size="sm" onClick={() => setStarting(t)}>
                    <PlayIcon />
                    Start
                  </Button>
                </RoleGate>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.summary}</p>
              <ol className="mt-4 flex flex-wrap items-center gap-1.5">
                {t.steps.map((s, i) => {
                  const Icon = KIND_ICON[s.kind];
                  return (
                    <li key={s.name} className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground"
                        title={s.note}
                      >
                        <Icon className="size-3 text-brand" aria-hidden />
                        {s.agentType}
                        {s.kind === "fanout" ? <span className="text-faint">×N</span> : null}
                      </span>
                      {i < t.steps.length - 1 ? <ChevronRightIcon className="size-3.5 text-faint" /> : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-strong p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How pipelines are built</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex gap-2">
                <CircleDotIcon className="mt-0.5 size-4 shrink-0 text-brand" /> <span><b className="font-medium text-foreground">Single</b> — one durable job.</span>
              </li>
              <li className="flex gap-2">
                <GitForkIcon className="mt-0.5 size-4 shrink-0 text-brand" /> <span><b className="font-medium text-foreground">Fan-out</b> — N jobs in parallel, joined when all settle.</span>
              </li>
              <li className="flex gap-2">
                <ScaleIcon className="mt-0.5 size-4 shrink-0 text-brand" /> <span><b className="font-medium text-foreground">Quality gate</b> — a critic scores the output; one retry with the critique, then park for a human.</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-faint">
              Shapes are defined in code, never improvised by a model — so every run is deterministic
              and replayable. Need a pipeline that isn&apos;t here? Request it from Agents.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-faint">Runs</h2>
        {workflows.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : workflows.isError ? (
          <QueryError message="Couldn't load workflows." onRetry={() => void workflows.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={WorkflowIcon}
            title="No workflow runs yet"
            description="Start a pipeline above — its steps, jobs and approvals are tracked here."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((wf) => (
              <Link
                key={wf.id}
                href={`${base}/workflows/${wf.id}`}
                className="block rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-strong"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {WORKFLOW_BY_TYPE.get(wf.workflowType)?.name ?? wf.workflowType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wf.createdAt ? wf.createdAt.toLocaleString() : "—"} · step{" "}
                      {Math.min(wf.currentStep + 1, wf.steps.length)} of {wf.steps.length}
                    </p>
                  </div>
                  <AnyStatusBadge value={wf.status} />
                </div>
                <div className="mt-3">
                  <StepProgress wf={wf} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <StartDialog template={starting} onOpenChange={(o) => !o && setStarting(null)} />
    </div>
  );
}
