"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useAdminOrg, useApproveOrg, useSuspendOrg } from "@/features/admin/hooks";
import type { AdminProjectRow } from "@/features/admin/project-config";
import { ApiError } from "@/api/client";
import { usd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { DataTable } from "@/components/ops/data-table";
import { Section } from "@/components/ops/primitives";

interface OrgDoc {
  orgId?: string;
  name?: string;
  status?: string;
  billingEmail?: string;
  createdAt?: string;
}

export default function AdminOrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const detail = useAdminOrg(orgId);
  const approve = useApproveOrg();
  const suspend = useSuspendOrg();

  const state = renderDetailState({ query: detail, backHref: "/admin/orgs", backLabel: "All organizations", noun: "organization" });
  if (state || !detail.data) return state;

  const org = (detail.data.org ?? {}) as OrgDoc;
  const projects = (detail.data.projects ?? []) as AdminProjectRow[];
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Action failed");

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Organizations", href: "/admin/orgs" }, { label: org.name ?? orgId }]}
      eyebrow="Organization"
      title={org.name ?? orgId}
      id={orgId}
      status={org.status ? <StatusBadge status={org.status as Status} /> : null}
      actions={
        org.status !== "approved" ? (
          <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(orgId, { onSuccess: () => toast.success("Organization approved"), onError })}>
            Approve
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            disabled={suspend.isPending}
            onClick={() => {
              if (!window.confirm(`Suspend ${org.name}? Every project in it stops running agents.`)) return;
              suspend.mutate(orgId, { onSuccess: () => toast.success("Organization suspended"), onError });
            }}
          >
            Suspend
          </Button>
        )
      }
      facts={[
        { label: "Billing email", value: org.billingEmail ?? "—" },
        { label: "Projects", value: String(projects.length) },
        { label: "Members", value: String(detail.data.members.length) },
        {
          label: "Billed this month",
          value: usd(projects.reduce((s, p) => s + (p.currentMonthUsage?.billedUsd ?? 0), 0)),
        },
      ]}
      aside={
        <div className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Related</p>
          <Link href={`/o/${orgId}`} className="block text-brand hover:underline">
            Open in the console
          </Link>
          <Link href={`/admin/billing`} className="block text-brand hover:underline">
            Invoices &amp; payments
          </Link>
        </div>
      }
    >
      <Section title="Projects">
        <DataTable
          rows={projects}
          getRowKey={(p) => p.projectId ?? ""}
          getRowHref={(p) => (p.projectId ? `/admin/projects/${p.projectId}` : null)}
          getRowLabel={(p) => `Open project ${p.name}`}
          empty={<p className="text-sm text-muted-foreground">This organization has no projects yet.</p>}
          columns={[
            {
              id: "project",
              header: "Project",
              cell: (p) => (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-mono text-[11px] text-faint">{p.projectId}</span>
                </div>
              ),
            },
            { id: "status", header: "Status", cell: (p) => <StatusBadge status={(p.status ?? "approved") as Status} /> },
            { id: "runs", header: "Runs (month)", align: "right", cell: (p) => (p.currentMonthUsage?.runs ?? 0).toLocaleString() },
            { id: "billed", header: "Billed (month)", align: "right", cell: (p) => usd(p.currentMonthUsage?.billedUsd ?? 0) },
            { id: "cap", header: "Cap", align: "right", cell: (p) => (p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—") },
            { id: "markup", header: "Markup", align: "right", cell: (p) => (p.markupMultiplier != null ? `${p.markupMultiplier}×` : "default") },
          ]}
        />
      </Section>

      <Section title="Members" description="Read-only — membership is managed by the organization.">
        <DataTable
          rows={detail.data.members}
          getRowKey={(m) => m.userId}
          getRowHref={(m) => `/admin/users/${m.userId}`}
          getRowLabel={(m) => `Open user ${m.email ?? m.userId}`}
          columns={[
            {
              id: "member",
              header: "Member",
              cell: (m) => (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{m.name ?? "Unknown"}</span>
                  <span className="text-muted-foreground">{m.email ?? m.userId}</span>
                </div>
              ),
            },
            { id: "role", header: "Role", cell: (m) => <span className="capitalize">{m.role}</span> },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
