"use client";

import { ReceiptIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useInvoices } from "@/features/projects/hooks";
import { useOrgCtx } from "@/features/orgs/org-context";
import { InvoiceTable } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProjectInvoicesPage() {
  const { projectId, project } = useProjectScope();
  const { can } = useOrgCtx();
  const invoices = useInvoices(projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description={`Monthly, itemized by agent — for ${project?.name ?? projectId} only.`}
      />

      {invoices.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : invoices.data && invoices.data.length > 0 ? (
        <InvoiceTable
          invoices={invoices.data}
          canSubmitPayment={can("invoice.submitPayment")}
        />
      ) : (
        <EmptyState
          icon={ReceiptIcon}
          title="No invoices yet"
          description="Invoices appear here once a month with billable activity closes."
        />
      )}
    </div>
  );
}
