import type { ExecutionRecord, Effect } from "@/types";
import { TERMINAL_DELIVERY_STATUSES } from "@/lib/status";

/**
 * Turn a run's recorded state into a plain-language diagnosis plus CONSERVATIVE next
 * steps. It never claims an action is safe that the backend doesn't establish as safe:
 * there is no retry/cancel/redeliver endpoint, so it never suggests one exists — a
 * fresh request (new requestId) is a new job, and says so.
 */

export type DiagnosisSeverity = "ok" | "info" | "warning" | "error";

export interface Diagnosis {
  severity: DiagnosisSeverity;
  /** Which layer the diagnosis is about. */
  layer: "run" | "approval" | "delivery" | "none";
  title: string;
  explanation: string;
  nextSteps: string[];
}

/** The callback effects of a run (tool effects are part of the run, not delivery). */
export function callbackEffects(rec: ExecutionRecord): Effect[] {
  return rec.effects.filter((e) => e.kind === "http.callback");
}

/** The least-settled callback, which decides what the delivery layer looks like. */
export function primaryDelivery(rec: ExecutionRecord): Effect | null {
  const order: Record<string, number> = { dead: 0, failed: 1, claimed: 2, ready: 3, pending: 4, cancelled: 5, succeeded: 6 };
  const cbs = callbackEffects(rec);
  if (cbs.length === 0) return null;
  return [...cbs].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))[0];
}

export function diagnose(rec: ExecutionRecord): Diagnosis {
  const { job } = rec;
  const delivery = primaryDelivery(rec);

  if ((job.status === "queued" || job.status === "running") && job.reviewedAt) {
    // Approve flips the job back to the durable queue (attempt reset to 0) so the
    // WORKER delivers the held output — this is delivery, not a new generation.
    return {
      severity: "info",
      layer: "approval",
      title: "Approved — delivering",
      explanation: "A reviewer approved the output. The worker is delivering the held result to your API.",
      nextSteps: [],
    };
  }

  if (job.status === "queued" || job.status === "running") {
    return {
      severity: "info",
      layer: "run",
      title: job.status === "queued" ? "Waiting for a worker" : "Running",
      explanation:
        job.status === "queued" && job.attempt > 0
          ? `Attempt ${job.attempt} of ${job.maxAttempts} failed; the job is queued for its next attempt with backoff.`
          : job.status === "queued"
            ? "The job is persisted and will be claimed by the next free worker."
            : `A worker holds this job (attempt ${job.attempt} of ${job.maxAttempts}). Finished steps are checkpointed as they complete.`,
      nextSteps: [],
    };
  }

  if (job.status === "pending_approval") {
    return {
      severity: "info",
      layer: "approval",
      title: "Waiting for human review",
      explanation:
        "The output is generated and validated. Its delivery to your API is held until a project admin approves it.",
      nextSteps: ["Review it in Approvals — you can edit the content before approving, or reject it with a note."],
    };
  }

  if (job.status === "rejected") {
    return {
      severity: "warning",
      layer: "approval",
      title: "Rejected by a reviewer",
      explanation:
        "A project admin rejected the output, so nothing was delivered. A rejection note, if given, is kept as a style rule for future runs.",
      nextSteps: ["If the input was right and the output wrong, send a new request — the next run reads the new style rule."],
    };
  }

  if (job.status === "dead") {
    const run = job.runStatus;
    if (run === "validation_failed") {
      return {
        severity: "error",
        layer: "run",
        title: "Output failed validation",
        explanation: `The agent's output did not pass its schema or safety checks on its final attempt (${job.attempt} of ${job.maxAttempts}). Nothing was delivered.`,
        nextSteps: [
          "Compare your request with the agent's request example in Docs — missing context or unusually large inputs are the usual cause.",
          "Send a corrected request with a new requestId; that starts a new job.",
        ],
      };
    }
    if (run === "rate_limited") {
      return {
        severity: "error",
        layer: "run",
        title: "The model provider rate-limited the run",
        explanation: `Every attempt (${job.attempt} of ${job.maxAttempts}) was refused by the provider's rate limit or quota. Nothing was delivered.`,
        nextSteps: [
          "This is usually temporary on the provider side. Send the request again later with a new requestId.",
          "If it persists across runs, open a support ticket with this job ID.",
        ],
      };
    }
    return {
      severity: "error",
      layer: "run",
      title: "The run failed",
      explanation: `The job used its retry budget (${job.attempt} of ${job.maxAttempts}) without succeeding and was dead-lettered. Nothing was delivered.`,
      nextSteps: [
        "Read the last error below — if it refers to your input, correct it and send a new request.",
        "Otherwise open a support ticket and include this job ID.",
      ],
    };
  }

  // job.status === "succeeded" — now the delivery layer decides the story.
  if (!delivery) {
    return {
      severity: "ok",
      layer: "none",
      title: "Run succeeded",
      explanation:
        "No callback was recorded for this run. That is expected for playground runs, when callbacks are suppressed, or for an agent with nothing to deliver.",
      nextSteps: [],
    };
  }

  if (delivery.status === "succeeded") {
    return {
      severity: "ok",
      layer: "delivery",
      title: "Run succeeded and was delivered",
      explanation: "Your endpoint acknowledged the callback with a 2xx response.",
      nextSteps: [],
    };
  }

  if (delivery.status === "dead") {
    return {
      severity: "error",
      layer: "delivery",
      title: "Run succeeded — delivery failed",
      explanation: delivery.outcomeUnknown
        ? "The delivery was dead-lettered with an UNKNOWN outcome: your endpoint may have received and processed it (for example a timeout after the request was sent)."
        : `The callback was retried ${delivery.attempt} times (5xx, 429 or timeouts) and then dead-lettered. The result is safe here; it just never reached your API.`,
      nextSteps: delivery.outcomeUnknown
        ? [
            "Check your system for this run's record before doing anything else.",
            "Redelivery is an operator action today — open a support ticket with this job ID if it's missing.",
          ]
        : [
            "Check that the callback URL for this environment is reachable and returns 2xx quickly (30 s timeout).",
            "Redelivery is an operator action today — open a support ticket with this job ID.",
          ],
    };
  }

  if (delivery.status === "failed") {
    return {
      severity: "error",
      layer: "delivery",
      title: "Run succeeded — your endpoint refused the delivery",
      explanation:
        "The callback got a non-retryable response (typically a 4xx), so it was not retried. The result is safe here.",
      nextSteps: [
        "Confirm your handler accepts this agent's method and path (see the agent's callback contract in Docs).",
        "Confirm it verifies X-Succor-Callback-Key against the current callback key — a rotated key causes 401s.",
      ],
    };
  }

  if (!TERMINAL_DELIVERY_STATUSES.has(delivery.status)) {
    const retrying = delivery.status === "ready" && !!delivery.error;
    return {
      severity: retrying ? "warning" : "info",
      layer: "delivery",
      title: retrying ? "Run succeeded — delivery retrying" : "Run succeeded — delivering",
      explanation: retrying
        ? `The last attempt failed (${delivery.error}). The next attempt is scheduled with backoff; up to 3 attempts are made.`
        : "The result is queued for delivery to your API.",
      nextSteps: retrying ? ["Make sure your endpoint is reachable — the next attempt will pick it up automatically."] : [],
    };
  }

  return {
    severity: "info",
    layer: "delivery",
    title: "Run succeeded — delivery not sent",
    explanation: "The delivery was cancelled before it was sent.",
    nextSteps: [],
  };
}
