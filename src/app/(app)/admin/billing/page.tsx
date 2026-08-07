"use client";

import { useState } from "react";
import { toast } from "sonner";
import { WalletIcon, Loader2Icon } from "lucide-react";

import {
  useAdminInvoices,
  usePatchInvoiceStatus,
  useGenerateAllInvoices,
  useBillingSettings,
  useUpdateBillingSettings,
} from "@/features/admin/hooks";
import { usd, periodLabel } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function PaymentQueue() {
  const queue = useAdminInvoices("payment_submitted");
  const patch = usePatchInvoiceStatus();

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-faint">Payments awaiting confirmation</h2>
      {queue.isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !queue.data || queue.data.invoices.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="Queue is clear"
          description="When an org owner submits a bank reference, it lands here for confirmation."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.data.invoices.map((inv) => (
                <TableRow key={inv.invoiceNumber}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                      <span className="text-xs text-muted-foreground">{periodLabel(inv)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{inv.orgName ?? "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground">{inv.projectId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(inv.totalBilledUsd)}</TableCell>
                  <TableCell className="font-mono text-xs" title={inv.paymentNote ?? undefined}>
                    {inv.paymentReference ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {inv.paymentSubmittedAt ? inv.paymentSubmittedAt.toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate(
                            {
                              projectId: inv.projectId,
                              invoiceNumber: inv.invoiceNumber,
                              status: "paid",
                            },
                            { onSuccess: () => toast.success("Payment confirmed — invoice paid"), onError },
                          )
                        }
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={patch.isPending}
                        onClick={() => {
                          const note = window.prompt("Rejection note for the org (optional):") ?? undefined;
                          patch.mutate(
                            {
                              projectId: inv.projectId,
                              invoiceNumber: inv.invoiceNumber,
                              status: "issued",
                              ...(note ? { note } : {}),
                            },
                            { onSuccess: () => toast.success("Submission rejected — back to issued"), onError },
                          );
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function AllInvoices() {
  const invoices = useAdminInvoices();
  const patch = usePatchInvoiceStatus();

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-faint">All invoices</h2>
      {invoices.isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !invoices.data || invoices.data.invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Org / project</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.invoices.map((inv) => (
                <TableRow key={inv.invoiceNumber}>
                  <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{inv.orgName ?? "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground">{inv.projectId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(inv.totalBilledUsd)}</TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status as Status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={patch.isPending}
                        onClick={() =>
                          patch.mutate(
                            { projectId: inv.projectId, invoiceNumber: inv.invoiceNumber, status: "issued" },
                            { onSuccess: () => toast.success("Invoice issued"), onError },
                          )
                        }
                      >
                        Issue
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function SettingsCards() {
  const settings = useBillingSettings();
  const update = useUpdateBillingSettings();
  const generateAll = useGenerateAllInvoices();
  const [markup, setMarkup] = useState("");
  const [month, setMonth] = useState(currentMonthKey());

  const currentDefault = settings.data?.["defaultMarkupMultiplier"];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Global markup</CardTitle>
          <CardDescription>
            Applied when a project has no override. Current:{" "}
            <span className="font-medium text-foreground">
              {typeof currentDefault === "number" ? `${currentDefault}×` : "3× (fallback)"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. 3"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            inputMode="decimal"
            className="max-w-32"
          />
          <Button
            disabled={update.isPending}
            onClick={() => {
              const v = Number(markup);
              if (Number.isNaN(v) || v < 1 || v > 100) {
                toast.error("Markup must be between 1 and 100");
                return;
              }
              update.mutate(v, {
                onSuccess: () => toast.success(`Global markup set to ${v}×`),
                onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed"),
              });
            }}
          >
            {update.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate invoices</CardTitle>
          <CardDescription>
            Build (or refresh drafts of) every project&apos;s invoice for a month.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="space-y-1">
            <Label htmlFor="gen-month" className="sr-only">
              Month
            </Label>
            <Input
              id="gen-month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM"
              className="max-w-32 font-mono"
            />
          </div>
          <Button
            disabled={generateAll.isPending}
            onClick={() => {
              if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
                toast.error("Month must be YYYY-MM");
                return;
              }
              generateAll.mutate(month, {
                onSuccess: () => toast.success(`Invoices generated for ${month}`),
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Generation failed"),
              });
            }}
          >
            {generateAll.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Generate all
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Confirm payments, issue invoices, and tune the global markup."
      />
      <PaymentQueue />
      <SettingsCards />
      <AllInvoices />
    </div>
  );
}
