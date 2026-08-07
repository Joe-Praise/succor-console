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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";
import type { Invoice } from "@/types";

export function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function periodLabel(inv: Invoice) {
  return inv.periodStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Detail dialog — line items + payment trail
// ---------------------------------------------------------------------------

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!invoice) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">{invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            {periodLabel(invoice)} · <span className="font-mono">{invoice.projectId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <StatusBadge status={invoice.status as Status} />
          <p className="text-lg font-medium tabular-nums text-foreground">
            {usd(invoice.totalBilledUsd)}
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((li) => (
                <TableRow key={li.agentType}>
                  <TableCell className="font-mono text-xs">{li.agentType}</TableCell>
                  <TableCell className="text-right tabular-nums">{li.runs}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {usd(li.costUsd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(li.billedUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {invoice.paymentReference ? (
          <p className="text-sm text-muted-foreground">
            Payment reference: <span className="font-mono">{invoice.paymentReference}</span>
            {invoice.paidAt
              ? ` · paid ${invoice.paidAt.toLocaleDateString()}`
              : invoice.paymentSubmittedAt
                ? ` · submitted ${invoice.paymentSubmittedAt.toLocaleDateString()}`
                : null}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
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
// Invoice table (shared by org billing + project invoices)
// ---------------------------------------------------------------------------

export function InvoiceTable({
  invoices,
  showProject = false,
  canSubmitPayment = false,
}: {
  invoices: Invoice[];
  showProject?: boolean;
  /** Org owners see a Pay action on issued invoices. */
  canSubmitPayment?: boolean;
}) {
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              {showProject ? <TableHead>Project</TableHead> : null}
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.invoiceNumber}>
                <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                {showProject ? (
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inv.projectId}
                  </TableCell>
                ) : null}
                <TableCell>{periodLabel(inv)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {usd(inv.totalBilledUsd)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={inv.status as Status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetail(inv)}>
                      View
                    </Button>
                    {canSubmitPayment && inv.status === "issued" ? (
                      <Button size="sm" onClick={() => setPaying(inv)}>
                        Pay
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InvoiceDetailDialog
        invoice={detail}
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
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
