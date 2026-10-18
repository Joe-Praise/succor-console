"use client";

import { toast } from "sonner";

import { usePatchInvoiceStatus } from "@/features/admin/hooks";
import { ApiError } from "@/api/client";
import type { Invoice } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * Platform-admin invoice transitions that the backend permits from each state:
 *   draft → issued · payment_submitted → paid (confirm) | issued (reject submission)
 * Used in the billing tables (compact) and on the invoice page.
 */
export function InvoiceAdminActions({ invoice, compact = false }: { invoice: Invoice; compact?: boolean }) {
  const patch = usePatchInvoiceStatus();
  const size = compact ? "xs" : "sm";
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Action failed");
  const base = { projectId: invoice.projectId, invoiceNumber: invoice.invoiceNumber };

  if (invoice.status === "draft") {
    return (
      <Button
        size={size}
        variant="outline"
        disabled={patch.isPending}
        onClick={() => patch.mutate({ ...base, status: "issued" }, { onSuccess: () => toast.success("Invoice issued"), onError })}
      >
        Issue
      </Button>
    );
  }
  if (invoice.status === "payment_submitted") {
    return (
      <div className="flex justify-end gap-1">
        <Button
          size={size}
          disabled={patch.isPending}
          onClick={() => {
            if (!window.confirm(`Confirm payment ${invoice.paymentReference ?? ""} and mark ${invoice.invoiceNumber} paid?`)) return;
            patch.mutate({ ...base, status: "paid" }, { onSuccess: () => toast.success("Payment confirmed — invoice paid"), onError });
          }}
        >
          Confirm
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={patch.isPending}
          onClick={() => {
            const note = window.prompt("Rejection note for the org (optional):") ?? undefined;
            patch.mutate(
              { ...base, status: "issued", ...(note ? { note } : {}) },
              { onSuccess: () => toast.success("Submission rejected — back to issued"), onError },
            );
          }}
        >
          Reject
        </Button>
      </div>
    );
  }
  return null;
}
