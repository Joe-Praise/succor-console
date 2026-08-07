"use client";

import { ReceiptIcon } from "lucide-react";

import { useOrgCtx } from "@/features/orgs/org-context";
import { useOrgBillingSummary, useOrgInvoices } from "@/features/orgs/hooks";
import { InvoiceTable, usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrgBillingPage() {
  const { org, can } = useOrgCtx();
  const summary = useOrgBillingSummary(org.orgId);
  const invoices = useOrgInvoices(org.orgId);

  const openTotal =
    (summary.data?.invoiceCounts["issued"]?.totalBilledUsd ?? 0) +
    (summary.data?.invoiceCounts["payment_submitted"]?.totalBilledUsd ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="Invoices are issued monthly, per project — pay each one individually."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spend this month</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data ? (
              <p className="text-2xl font-medium tabular-nums">{usd(summary.data.totalBilledUsd)}</p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data ? (
              <p className="text-2xl font-medium tabular-nums">{usd(openTotal)}</p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid to date</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.data ? (
              <p className="text-2xl font-medium tabular-nums">
                {usd(summary.data.invoiceCounts["paid"]?.totalBilledUsd ?? 0)}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">This month by project</h2>
        {summary.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : summary.data && summary.data.byProject.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Provider cost</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Budget cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.data.byProject.map((p) => (
                  <TableRow key={p.projectId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.runs}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {usd(p.costUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usd(p.billedUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No usage recorded this month.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Invoices</h2>
        {invoices.isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : invoices.data && invoices.data.invoices.length > 0 ? (
          <InvoiceTable
            invoices={invoices.data.invoices}
            showProject
            canSubmitPayment={can("invoice.submitPayment")}
          />
        ) : (
          <EmptyState
            icon={ReceiptIcon}
            title="No invoices yet"
            description="Invoices appear here once a month with billable activity closes."
          />
        )}
      </section>
    </div>
  );
}
