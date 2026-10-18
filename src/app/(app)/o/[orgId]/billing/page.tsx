"use client";

import { ReceiptIcon } from "lucide-react";

import { useOrgCtx } from "@/features/orgs/org-context";
import { useOrgBillingSummary, useOrgInvoices } from "@/features/orgs/hooks";
import { InvoiceTable } from "@/features/invoices/invoice-ui";
import { usd } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ops/data-table";

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
          <DataTable
            rows={summary.data.byProject}
            getRowKey={(p) => p.projectId}
            getRowHref={(p) => `/o/${org.orgId}/p/${p.projectId}/usage`}
            getRowLabel={(p) => `Open usage for ${p.name}`}
            columns={[
              { id: "name", header: "Project", cell: (p) => <span className="font-medium text-foreground">{p.name}</span> },
              { id: "runs", header: "Runs", align: "right", cell: (p) => p.runs.toLocaleString() },
              { id: "cost", header: "Provider cost", align: "right", cell: (p) => <span className="text-muted-foreground">{usd(p.costUsd)}</span> },
              { id: "billed", header: "Billed", align: "right", cell: (p) => usd(p.billedUsd) },
              {
                id: "cap",
                header: "Budget cap",
                align: "right",
                cell: (p) => <span className="text-muted-foreground">{p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—"}</span>,
              },
            ]}
          />
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
            hrefFor={(inv) => `/o/${org.orgId}/p/${inv.projectId}/invoices/${inv.invoiceNumber}`}
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
