"use client";

import Link from "next/link";
import { GitForkIcon, ScaleIcon, CircleDotIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { dotClass, LIVE_JOB_STATUSES } from "@/lib/status";
import { shortId } from "@/lib/format";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import type { WorkflowStep } from "@/types";
import { SignalWire } from "@/components/ops/signal-wire";

/**
 * A job id as a status chip. The status comes from ONE runs-list query for the whole
 * workflow (passed in), not a poller per chip — a fan-out step can have dozens.
 */
export function JobChip({
  jobId,
  href,
  label,
  status,
}: {
  jobId: string;
  href: string;
  label?: string;
  status?: string;
}) {
  return (
    <Link
      href={href}
      title={status ? `${jobId} — ${status.replace("_", " ")}` : jobId}
      className="inline-flex h-5 items-center gap-1.5 rounded-[4px] border border-border px-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-strong hover:text-foreground"
    >
      <span
        className={cn("size-1.5 rounded-full", status ? dotClass(status) : "bg-faint", status && LIVE_JOB_STATUSES.has(status) && "live-dot")}
        aria-hidden
      />
      {label ?? shortId(jobId, 6)}
    </Link>
  );
}

const KIND_META: Record<string, { label: string; icon: typeof GitForkIcon; blurb: string }> = {
  single: { label: "Single", icon: CircleDotIcon, blurb: "one durable job" },
  fanout: { label: "Fan-out", icon: GitForkIcon, blurb: "parallel jobs, joined when all settle" },
  gate: { label: "Quality gate", icon: ScaleIcon, blurb: "generator, critic, one retry, then park" },
};

/** The joint between two steps. It moves while the step before it is working. */
function Joint({ state }: { state: "live" | "passed" | "idle" }) {
  return (
    <SignalWire
      className="mx-1 hidden w-8 shrink-0 self-center lg:block"
      moving={state === "live"}
      color={state === "live" ? "var(--info)" : state === "passed" ? "var(--success)" : "var(--wire)"}
    />
  );
}

/**
 * A workflow's steps on one line, left to right. Each tile shows the step's kind, status,
 * and every durable job it spawned as a live chip. The current step is ringed.
 */
export function StepGraph({
  steps,
  currentStep,
  jobHref,
  statusOf,
}: {
  steps: WorkflowStep[];
  currentStep: number;
  jobHref: (jobId: string) => string;
  statusOf?: (jobId: string) => string | undefined;
}) {
  return (
    <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
      {steps.map((step, i) => {
        const meta = KIND_META[step.kind] ?? KIND_META.single;
        const isCurrent = i === currentStep && !["succeeded", "failed"].includes(step.status);
        const ahead = step.status === "pending";
        const joint: "live" | "passed" | "idle" = step.status === "succeeded" ? "passed" : isCurrent && !ahead ? "live" : "idle";
        return (
          <li key={step.name} className="flex min-w-0 flex-1 lg:items-stretch">
            <div className={cn("tile min-w-0 flex-1 p-3", isCurrent && "border-brand/70", ahead && "bg-transparent")}>
              <div className="flex items-start justify-between gap-2">
                <p className="kicker flex items-center gap-1.5">
                  <meta.icon className="size-3" strokeWidth={2} aria-hidden />
                  {String(i + 1).padStart(2, "0")} {meta.label}
                </p>
                <AnyStatusBadge value={step.status} />
              </div>
              <p className={cn("mt-1.5 truncate text-[13px] font-semibold", ahead ? "text-muted-foreground" : "text-foreground")}>{step.name}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{step.agentType}</p>
              <p className="mt-1 text-[11px] text-faint">
                {meta.blurb}
                {step.kind === "gate" && step.attempt ? `, attempt ${step.attempt + 1}` : ""}
              </p>

              {step.jobIds.length > 0 || step.criticJobId ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                  {step.jobIds.slice(0, 24).map((id) => (
                    <JobChip key={id} jobId={id} href={jobHref(id)} status={statusOf?.(id)} />
                  ))}
                  {step.jobIds.length > 24 ? <span className="text-[11px] text-faint">+{step.jobIds.length - 24} more</span> : null}
                  {step.criticJobId ? <JobChip jobId={step.criticJobId} href={jobHref(step.criticJobId)} label="critic" status={statusOf?.(step.criticJobId)} /> : null}
                </div>
              ) : null}

              {step.note ? <p className="mt-2.5 rounded-md bg-raised px-2.5 py-1.5 text-xs text-muted-foreground">{step.note}</p> : null}
            </div>
            {i < steps.length - 1 ? <Joint state={joint} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
