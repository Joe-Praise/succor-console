import { CheckIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The durable job state machine, drawn as a rail. Mirrors agent-service
 * models/agent-job.model.ts:
 *
 *   queued ─claim─▶ running ─▶ succeeded
 *                     │      ─▶ pending_approval ─approve─▶ queued (delivery) ─▶ succeeded
 *                     │                          ─reject──▶ rejected
 *                     └─attempts exhausted─▶ dead
 *
 * `gated` (the agent's riskTier is "high") inserts the human-approval stop so a
 * reviewer can see where the job is parked.
 */

type NodeState = "done" | "current" | "todo" | "failed";

interface RailNode {
  key: string;
  label: string;
  sub?: string;
  state: NodeState;
}

function buildNodes(status: string, gated: boolean, attempt: number, maxAttempts: number): RailNode[] {
  const attemptLabel = maxAttempts > 1 ? `attempt ${Math.max(attempt, 1)} of ${maxAttempts}` : undefined;
  const order = ["queued", "running", ...(gated ? ["pending_approval"] : []), "succeeded"];
  const labels: Record<string, string> = {
    queued: "Queued",
    running: "Running",
    pending_approval: "Human review",
    succeeded: "Delivered",
  };

  if (status === "dead" || status === "rejected") {
    const failAt = status === "rejected" ? "pending_approval" : "running";
    const nodes: RailNode[] = [];
    for (const k of order) {
      if (k === "succeeded") break;
      nodes.push({ key: k, label: labels[k], state: "done", sub: k === "running" ? attemptLabel : undefined });
      if (k === failAt) break;
    }
    nodes.push({
      key: status,
      label: status === "dead" ? "Dead-lettered" : "Rejected",
      sub: status === "dead" ? "retries exhausted" : "delivery discarded",
      state: "failed",
    });
    return nodes;
  }

  const idx = Math.max(order.indexOf(status), 0);
  return order.map((k, i) => ({
    key: k,
    label: labels[k],
    sub: k === "running" ? attemptLabel : k === "pending_approval" && status === k ? "waiting on an admin" : undefined,
    state: status === "succeeded" ? "done" : i < idx ? "done" : i === idx ? "current" : "todo",
  }));
}

export function LifecycleRail({
  status,
  gated = false,
  attempt = 1,
  maxAttempts = 1,
  className,
}: {
  status: string;
  gated?: boolean;
  attempt?: number;
  maxAttempts?: number;
  className?: string;
}) {
  const nodes = buildNodes(status, gated || status === "pending_approval" || status === "rejected", attempt, maxAttempts);

  return (
    <ol className={cn("flex w-full items-start", className)} aria-label="Job lifecycle">
      {nodes.map((n, i) => {
        const last = i === nodes.length - 1;
        return (
          <li key={n.key} className={cn("relative flex min-w-0 flex-col", last ? "flex-none" : "flex-1")}>
            <div className="flex items-center">
              <span
                className={cn(
                  "relative grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                  n.state === "done" && "border-transparent bg-success text-white",
                  n.state === "current" && "border-brand bg-brand-muted text-brand",
                  n.state === "todo" && "border-strong bg-surface text-faint",
                  n.state === "failed" && "border-transparent bg-error text-white",
                )}
                aria-current={n.state === "current" ? "step" : undefined}
              >
                {n.state === "done" ? (
                  <CheckIcon className="size-3.5" />
                ) : n.state === "failed" ? (
                  <XIcon className="size-3.5" />
                ) : (
                  i + 1
                )}
                {n.state === "current" ? (
                  <span className="absolute inset-0 animate-ping rounded-full border border-brand opacity-40 motion-reduce:hidden" />
                ) : null}
              </span>
              {!last ? (
                <span
                  className={cn(
                    "mx-2 h-px flex-1",
                    n.state === "done" ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className="mt-2 pr-3">
              <p
                className={cn(
                  "text-xs font-medium",
                  n.state === "todo" ? "text-faint" : n.state === "failed" ? "text-error" : "text-foreground",
                )}
              >
                {n.label}
              </p>
              {n.sub ? <p className="text-[11px] text-faint">{n.sub}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
