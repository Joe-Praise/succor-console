"use client";

import { useParams } from "next/navigation";

import { useAdminOrg } from "@/features/admin/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrgDoc {
  orgId?: string;
  name?: string;
  status?: string;
  billingEmail?: string;
}

interface ProjectRow {
  projectId?: string;
  name?: string;
  status?: string;
  monthlyBudgetUsd?: number | null;
  markupMultiplier?: number | null;
  currentMonthUsage?: { runs?: number; billedUsd?: number } | null;
}

export default function AdminOrgDetailPage() {
  const params = useParams<{ orgId: string }>();
  const detail = useAdminOrg(params.orgId);

  const org = (detail.data?.org ?? {}) as OrgDoc;
  const projects = (detail.data?.projects ?? []) as ProjectRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title={org.name ?? params.orgId}
        description={org.billingEmail ? `Billing: ${org.billingEmail}` : undefined}
        action={org.status ? <StatusBadge status={org.status as Status} /> : undefined}
      />

      {detail.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-faint">Projects</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Runs (month)</TableHead>
                    <TableHead className="text-right">Billed (month)</TableHead>
                    <TableHead className="text-right">Cap</TableHead>
                    <TableHead className="text-right">Markup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p, i) => (
                    <TableRow key={p.projectId ?? i}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{p.projectId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={(p.status ?? "approved") as Status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.currentMonthUsage?.runs ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {usd(p.currentMonthUsage?.billedUsd ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.markupMultiplier != null ? `${p.markupMultiplier}×` : "default"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-faint">Members (read-only — org-managed)</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail.data?.members ?? []).map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.name ?? "Unknown"}</span>
                          <span className="text-muted-foreground">{m.email ?? m.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{m.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
