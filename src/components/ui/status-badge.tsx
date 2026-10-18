import { cn } from "@/lib/utils";

/**
 * The status vocabulary spoken across invoices, projects, agent requests, durable
 * jobs, workflows, support tickets and the audit ledger. Tone mapping is fixed by
 * §4.5. Labels are sentence case (never uppercase); every badge carries a dot + a
 * 12%-tint bg + colored text — never color-only.
 */
export type Status =
  // invoices
  | "draft"
  | "issued"
  | "payment_submitted"
  | "paid"
  | "void"
  // projects / orgs / requests
  | "pending"
  | "approved"
  | "suspended"
  | "in_review"
  | "building"
  | "delivered"
  | "rejected"
  | "active"
  | "revoked"
  // durable jobs (AgentJob)
  | "queued"
  | "running"
  | "succeeded"
  | "dead"
  | "pending_approval"
  // run outcomes (AgentLog / playground)
  | "success"
  | "error"
  | "rate_limited"
  | "validation_failed"
  | "skipped"
  // workflows + steps
  | "paused"
  | "failed"
  | "critiquing"
  // support tickets
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  // audit outcomes
  | "allowed"
  | "conflict"
  | "refused"
  // tools
  | "enabled"
  | "disabled";

type Tone = { label: string; text: string; bg: string; dot: string; pulse?: boolean };

const NEUTRAL = { text: "text-muted-foreground", bg: "bg-raised", dot: "bg-muted-foreground" };
const INFO = { text: "text-info", bg: "bg-info-bg", dot: "bg-info" };
const WARN = { text: "text-warning", bg: "bg-warning-bg", dot: "bg-warning" };
const GOOD = { text: "text-success", bg: "bg-success-bg", dot: "bg-success" };
const BAD = { text: "text-error", bg: "bg-error-bg", dot: "bg-error" };
const FAINT = { text: "text-faint", bg: "bg-transparent", dot: "bg-faint" };

const STATUS: Record<Status, Tone> = {
  draft: { label: "Draft", ...NEUTRAL },
  issued: { label: "Issued", ...INFO },
  payment_submitted: { label: "Payment submitted", ...WARN },
  paid: { label: "Paid", ...GOOD },
  void: { label: "Void", ...FAINT },
  pending: { label: "Pending", ...WARN },
  approved: { label: "Approved", ...GOOD },
  suspended: { label: "Suspended", ...BAD },
  in_review: { label: "In review", ...INFO },
  building: { label: "Building", text: "text-brand", bg: "bg-info-bg", dot: "bg-brand" },
  delivered: { label: "Delivered", ...GOOD },
  rejected: { label: "Rejected", ...BAD },
  active: { label: "Active", ...GOOD },
  revoked: { label: "Revoked", ...FAINT },

  queued: { label: "Queued", ...NEUTRAL, pulse: true },
  running: { label: "Running", ...INFO, pulse: true },
  succeeded: { label: "Succeeded", ...GOOD },
  dead: { label: "Dead-lettered", ...BAD },
  pending_approval: { label: "Awaiting approval", ...WARN },

  success: { label: "Success", ...GOOD },
  error: { label: "Error", ...BAD },
  rate_limited: { label: "Rate limited", ...WARN },
  validation_failed: { label: "Validation failed", ...BAD },
  skipped: { label: "Skipped", ...FAINT },

  paused: { label: "Paused", ...WARN },
  failed: { label: "Failed", ...BAD },
  critiquing: { label: "Critiquing", ...INFO, pulse: true },

  open: { label: "Open", ...WARN },
  in_progress: { label: "In progress", ...INFO },
  resolved: { label: "Resolved", ...GOOD },
  closed: { label: "Closed", ...FAINT },

  allowed: { label: "Allowed", ...GOOD },
  conflict: { label: "Conflict", ...WARN },
  refused: { label: "Refused", ...BAD },

  enabled: { label: "Enabled", ...GOOD },
  disabled: { label: "Disabled", ...FAINT },
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && value in STATUS;
}

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: Status;
  className?: string;
  /** Override the default label (e.g. a count or a domain-specific word). */
  label?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, s.pulse && "animate-pulse")} aria-hidden />
      {label ?? s.label}
    </span>
  );
}

/** StatusBadge for an untrusted string — unknown values render as a neutral pill. */
export function AnyStatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (isStatus(value)) return <StatusBadge status={value} className={className} />;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
      {value ?? "—"}
    </span>
  );
}
