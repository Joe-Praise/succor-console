"use client";

import Link from "next/link";
import { GitForkIcon, ScaleIcon, ArrowDownIcon, CircleDotIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useJob } from "@/features/runtime/hooks";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import type { WorkflowStep } from "@/types";

const DOT: Record<string, string> = {
  queued: "bg-muted-foreground",
  running: "bg-info animate-pulse",
  succeeded: "bg-success",
  dead: "bg-error",
  pending_approval: "bg-warning",
  rejected: "bg-error",
};

/** A job id as a live chip — colors itself from the job's own status. */
export function JobChip({ jobId, href, label }: { jobId: string; href: string; label?: string }) {
  const job = useJob(jobId);
  const status = job.data?.job.status;
  return (
    <Link
      href={href}
      title={status ? `${jobId} — ${status.replace("_", " ")}` : jobId}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-strong hover:text-foreground"
    >
      <span className={cn("size-1.5 rounded-full", status ? DOT[status] ?? "bg-faint" : "bg-faint")} aria-hidden />
      {label ?? `…${jobId.slice(-6)}`}
    </Link>
  );
}

const KIND_META: Record<string, { label: string; icon: typeof GitForkIcon; blurb: string }> = {
  single: { label: "Single", icon: CircleDotIcon, blurb: "one durable job" },
  fanout: { label: "Fan-out", icon: GitForkIcon, blurb: "N parallel jobs, joined when all settle" },
  gate: { label: "Quality gate", icon: ScaleIcon, blurb: "generator → critic → one retry → park" },
};

/**
 * A workflow's steps as a vertical graph. Each step shows its kind (single,
 * fan-out, quality gate), status, and every durable job it spawned as a live chip.
 * The current step is ringed; steps ahead of it stay muted.
 */
export function StepGraph({
  steps,
  currentStep,
  jobHref,
}: {
  steps: WorkflowStep[];
  currentStep: number;
  jobHref: (jobId: string) => string;
}) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const meta = KIND_META[step.kind] ?? KIND_META.single;
        const isCurrent = i === currentStep && !["succeeded", "failed"].includes(step.status);
        const ahead = step.status === "pending";
        return (
          <li key={step.name} className="relative">
            <div
              className={cn(
                "rounded-xl border bg-surface p-4 transition-colors",
                isCurrent ? "border-brand shadow-sm" : "border-border",
                ahead && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-faint">
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>{" "}
                      {step.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{step.agentType}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {meta.label} · {meta.blurb}
                      {step.kind === "gate" && step.attempt ? ` · attempt ${step.attempt + 1}` : ""}
                    </p>
                  </div>
                </div>
                <AnyStatusBadge value={step.status} />
              </div>

              {step.jobIds.length > 0 || step.criticJobId ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {step.jobIds.slice(0, 24).map((id) => (
                    <JobChip key={id} jobId={id} href={jobHref(id)} />
                  ))}
                  {step.jobIds.length > 24 ? (
                    <span className="text-xs text-faint">+{step.jobIds.length - 24} more</span>
                  ) : null}
                  {step.criticJobId ? (
                    <JobChip jobId={step.criticJobId} href={jobHref(step.criticJobId)} label="critic" />
                  ) : null}
                </div>
              ) : null}

              {step.note ? (
                <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-xs text-muted-foreground">{step.note}</p>
              ) : null}
            </div>
            {i < steps.length - 1 ? (
              <div className="flex justify-center py-1.5 text-faint" aria-hidden>
                <ArrowDownIcon className="size-4" />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
