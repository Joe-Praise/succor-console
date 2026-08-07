import { cn } from "@/lib/utils";

/**
 * The status vocabulary spoken across invoices, projects, and agent requests.
 * Tone mapping is fixed by §4.5. Labels are sentence case (never uppercase);
 * every badge carries a dot + a 12%-tint bg + colored text — never color-only.
 */
export type Status =
  | "draft"
  | "issued"
  | "payment_submitted"
  | "paid"
  | "void"
  | "pending"
  | "approved"
  | "suspended"
  | "in_review"
  | "building"
  | "delivered"
  | "rejected"
  | "active"
  | "revoked";

const STATUS: Record<
  Status,
  { label: string; text: string; bg: string; dot: string }
> = {
  draft: { label: "Draft", text: "text-muted-foreground", bg: "bg-raised", dot: "bg-muted-foreground" },
  issued: { label: "Issued", text: "text-info", bg: "bg-info-bg", dot: "bg-info" },
  payment_submitted: { label: "Payment submitted", text: "text-warning", bg: "bg-warning-bg", dot: "bg-warning" },
  paid: { label: "Paid", text: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  void: { label: "Void", text: "text-faint", bg: "bg-transparent", dot: "bg-faint" },
  pending: { label: "Pending", text: "text-warning", bg: "bg-warning-bg", dot: "bg-warning" },
  approved: { label: "Approved", text: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  suspended: { label: "Suspended", text: "text-error", bg: "bg-error-bg", dot: "bg-error" },
  in_review: { label: "In review", text: "text-info", bg: "bg-info-bg", dot: "bg-info" },
  building: { label: "Building", text: "text-brand", bg: "bg-info-bg", dot: "bg-brand" },
  delivered: { label: "Delivered", text: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  rejected: { label: "Rejected", text: "text-error", bg: "bg-error-bg", dot: "bg-error" },
  active: { label: "Active", text: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  revoked: { label: "Revoked", text: "text-faint", bg: "bg-transparent", dot: "bg-faint" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}
