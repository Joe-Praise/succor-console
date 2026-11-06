"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useInvoice } from "@/features/projects/hooks";
import { InvoiceAdminActions } from "@/features/admin/invoice-actions";
import { periodLabel } from "@/features/invoices/invoice-ui";
import { usd, usdPrecise, tokens, dateTime } from "@/lib/format";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { Section } from "@/components/ops/primitives";

/** Platform-admin view of one project's invoice, with the state transitions it allows. */
export default function AdminInvoicePage() {
  const { projectId, invoiceNumber } = useParams<{ projectId: string; invoiceNumber: string }>();
  const q = useInvoice(projectId, invoiceNumber);

  const state = renderDetailState({ query: q, backHref: "/admin/billing", backLabel: "Billing", noun: "invoice" });
  if (state || !q.data) return state;
  const inv = q.data;
  const gain = inv.totalBilledUsd - inv.totalCostUsd;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Billing", href: "/admin/billing" }, { label: inv.invoiceNumber }]}
      eyebrow={`Invoice · ${periodLabel(inv)}`}
      title={usd(inv.totalBilledUsd)}
      id={inv.invoiceNumber}
      status={<StatusBadge status={inv.status as Status} />}
      actions={<InvoiceAdminActions invoice={inv} />}
      facts={[
        { label: "Project", value: <Link href={`/admin/projects/${inv.projectId}`} className="font-mono text-xs text-brand hover:underline">{inv.projectId}</Link> },
        { label: "Provider cost", value: usdPrecise(inv.totalCostUsd) },
        { label: "Gain", value: usd(gain) },
        { label: "Payment reference", value: inv.paymentReference ? <span className="font-mono text-xs">{inv.paymentReference}</span> : "—" },
      ]}
      aside={
        <div className="space-y-2 tile p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Trail</p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-3"><dt className="text-faint">Generated</dt><dd>{dateTime(inv.generatedAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-faint">Issued</dt><dd>{dateTime(inv.issuedAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-faint">Payment submitted</dt><dd>{dateTime(inv.paymentSubmittedAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-faint">Paid</dt><dd>{dateTime(inv.paidAt)}</dd></div>
          </dl>
          {inv.paymentNote ? <p className="border-t border-border pt-2 text-xs text-muted-foreground">Note: {inv.paymentNote}</p> : null}
        </div>
      }
    >
      <Section title="Line items">
        <DataTable
          rows={inv.lineItems}
          getRowKey={(li) => li.agentType}
          columns={[
            { id: "agent", header: "Agent", cell: (li) => <span className="font-mono text-xs">{li.agentType}</span> },
            { id: "runs", header: "Runs", align: "right", cell: (li) => li.runs.toLocaleString() },
            { id: "tokens", header: "Tokens", align: "right", cell: (li) => tokens(li.inputTokens + li.outputTokens + li.embeddingTokens) },
            { id: "cost", header: "Provider cost", align: "right", cell: (li) => usdPrecise(li.costUsd) },
            { id: "billed", header: "Billed", align: "right", cell: (li) => usd(li.billedUsd) },
            { id: "gain", header: "Gain", align: "right", cell: (li) => <span className="text-success">{usd(li.billedUsd - li.costUsd)}</span> },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
