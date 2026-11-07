"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { useSubmitPayment } from "@/features/projects/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ops/data-table";
import { ApiError } from "@/api/client";
import type { Invoice } from "@/types";

import { usd } from "@/lib/format";

export function periodLabel(inv: Invoice) {
  return inv.periodStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Submit-payment dialog (org OWNER, issued invoices only)
// ---------------------------------------------------------------------------

const SubmitSchema = z.object({
  paymentReference: z.string().min(3, "Enter the transfer reference (min 3 characters)"),
  paymentNote: z.string().max(500).optional(),
});
type SubmitValues = z.infer<typeof SubmitSchema>;

export function SubmitPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const submit = useSubmitPayment(invoice?.projectId ?? "");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmitValues>({
    resolver: zodResolver(SubmitSchema),
    defaultValues: { paymentReference: "", paymentNote: "" },
  });

  if (!invoice) return null;
  const serverError = submit.error instanceof ApiError ? submit.error.message : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit payment</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} · {usd(invoice.totalBilledUsd)} — after your bank
            transfer, record the reference here; we confirm it and mark the invoice paid.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            submit.mutate(
              {
                invoiceNumber: invoice.invoiceNumber,
                paymentReference: v.paymentReference,
                ...(v.paymentNote ? { paymentNote: v.paymentNote } : {}),
              },
              {
                onSuccess: () => {
                  reset();
                  onOpenChange(false);
                  toast.success("Payment submitted — we'll confirm it shortly.");
                },
              },
            ),
          )}
        >
          {serverError ? (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">Transfer reference</Label>
            <Input
              id="pay-ref"
              placeholder="e.g. TRF-2026-00123"
              className="font-mono"
              aria-invalid={!!errors.paymentReference}
              {...register("paymentReference")}
            />
            {errors.paymentReference ? (
              <p className="text-xs text-error">{errors.paymentReference.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Textarea id="pay-note" rows={2} {...register("paymentNote")} />
          </div>

          <Button type="submit" className="w-full" disabled={submit.isPending}>
            {submit.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Submit payment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invoice table (shared by org billing + project invoices). Each row opens the
// invoice's own page; "Pay" is an in-row control that never navigates.
// ---------------------------------------------------------------------------

export function InvoiceTable({
  invoices,
  hrefFor,
  showProject = false,
  canSubmitPayment = false,
}: {
  invoices: Invoice[];
  /** The invoice page for a row (project-scoped route). */
  hrefFor: (inv: Invoice) => string;
  showProject?: boolean;
  /** Org owners see a Pay action on issued invoices. */
  canSubmitPayment?: boolean;
}) {
  const [paying, setPaying] = useState<Invoice | null>(null);

  const columns: Column<Invoice>[] = [
    { id: "number", header: "Invoice", cell: (inv) => <span className="font-mono text-xs text-foreground">{inv.invoiceNumber}</span> },
    ...(showProject
      ? [{ id: "project", header: "Project", cell: (inv: Invoice) => <span className="font-mono text-xs text-muted-foreground">{inv.projectId}</span> }]
      : []),
    { id: "period", header: "Period", cell: (inv) => periodLabel(inv) },
    { id: "total", header: "Total", align: "right", cell: (inv) => usd(inv.totalBilledUsd) },
    { id: "status", header: "Status", cell: (inv) => <StatusBadge status={inv.status as Status} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      interactive: true,
      cell: (inv) =>
        canSubmitPayment && inv.status === "issued" ? (
          <Button size="xs" onClick={() => setPaying(inv)}>
            Pay
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        rows={invoices}
        columns={columns}
        getRowKey={(inv) => inv.invoiceNumber}
        getRowHref={hrefFor}
        getRowLabel={(inv) => `Open invoice ${inv.invoiceNumber}`}
      />
      <SubmitPaymentDialog
        invoice={paying}
        open={!!paying}
        onOpenChange={(o) => {
          if (!o) setPaying(null);
        }}
      />
    </>
  );
}
