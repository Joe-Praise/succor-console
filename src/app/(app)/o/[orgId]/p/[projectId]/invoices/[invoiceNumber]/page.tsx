"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckIcon, CircleDashedIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useInvoice } from "@/features/projects/hooks";
import { useOrgCtx } from "@/features/orgs/org-context";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { SubmitPaymentDialog, periodLabel } from "@/features/invoices/invoice-ui";
import { cn } from "@/lib/utils";
import { usd, usdPrecise, tokens, dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { Section } from "@/components/ops/primitives";

export default function InvoicePage() {
  const { orgId, projectId } = useProjectScope();
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const { can } = useOrgCtx();
  const q = useInvoice(projectId, invoiceNumber);
  const { nameOf } = useAgentNames(projectId);
  const [paying, setPaying] = useState(false);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: q, backHref: `${base}/invoices`, backLabel: "All invoices", noun: "invoice" });
  if (state || !q.data) return state;
  const inv = q.data;

  const from = inv.periodStart.toISOString();
  const to = inv.periodEnd.toISOString();
  const steps: Array<{ label: string; at: Date | null | undefined; done: boolean }> = [
    { label: "Generated", at: inv.generatedAt, done: true },
    { label: "Issued", at: inv.issuedAt, done: ["issued", "payment_submitted", "paid"].includes(inv.status) },
    {
      label: "Payment submitted",
      at: inv.paymentSubmittedAt,
      done: ["payment_submitted", "paid"].includes(inv.status),
    },
    { label: "Paid", at: inv.paidAt, done: inv.status === "paid" },
  ];

  return (
    <DetailPage
      breadcrumbs={[{ label: "Invoices", href: `${base}/invoices` }, { label: inv.invoiceNumber }]}
      eyebrow={`Invoice · ${periodLabel(inv)}`}
      title={usd(inv.totalBilledUsd)}
      id={inv.invoiceNumber}
      status={<StatusBadge status={inv.status as Status} />}
      actions={
        can("invoice.submitPayment") && inv.status === "issued" ? (
          <Button size="sm" onClick={() => setPaying(true)}>
            Submit payment
          </Button>
        ) : null
      }
      facts={[
        { label: "Period", value: `${dateTime(inv.periodStart)} → ${dateTime(inv.periodEnd)}` },
        { label: "Provider cost", value: usdPrecise(inv.totalCostUsd) },
        { label: "Billed", value: usd(inv.totalBilledUsd) },
        { label: "Payment reference", value: inv.paymentReference ? <span className="font-mono text-xs">{inv.paymentReference}</span> : "—" },
      ]}
      aside={
        <div className="space-y-3 tile p-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Status</p>
          <ol className="space-y-2.5">
            {steps.map((s) => (
              <li key={s.label} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                    s.done ? "bg-success text-background" : "border border-strong text-faint",
                  )}
                >
                  {s.done ? <CheckIcon className="size-2.5" /> : <CircleDashedIcon className="size-2.5" />}
                </span>
                <span className="text-sm">
                  <span className={s.done ? "text-foreground" : "text-faint"}>{s.label}</span>
                  {s.at ? <span className="block text-xs text-faint">{dateTime(s.at)}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          {inv.status === "void" ? <p className="text-xs text-faint">This invoice was voided.</p> : null}
          {inv.paymentNote ? (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">Note: {inv.paymentNote}</p>
          ) : null}
        </div>
      }
    >
      <Section
        title="Line items"
        description="One line per agent. Open a line to see every priced record behind it."
      >
        <DataTable
          rows={inv.lineItems}
          getRowKey={(li) => li.agentType}
          getRowHref={(li) => `${base}/logs?agent=${li.agentType}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
          getRowLabel={(li) => `Open priced records for ${nameOf(li.agentType)}`}
          columns={[
            {
              id: "agent",
              header: "Agent",
              cell: (li) => (
                <div>
                  <p className="text-foreground">{nameOf(li.agentType)}</p>
                  <p className="font-mono text-[11px] text-faint">{li.agentType}</p>
                </div>
              ),
            },
            { id: "runs", header: "Runs", align: "right", cell: (li) => li.runs.toLocaleString() },
            {
              id: "tokens",
              header: "Tokens",
              align: "right",
              cell: (li) => tokens(li.inputTokens + li.outputTokens + li.embeddingTokens),
            },
            { id: "cost", header: "Provider cost", align: "right", cell: (li) => <span className="text-muted-foreground">{usdPrecise(li.costUsd)}</span> },
            { id: "billed", header: "Billed", align: "right", cell: (li) => usd(li.billedUsd) },
          ]}
        />
      </Section>

      <SubmitPaymentDialog invoice={paying ? inv : null} open={paying} onOpenChange={setPaying} />
    </DetailPage>
  );
}
