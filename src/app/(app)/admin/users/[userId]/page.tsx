"use client";

import { useParams } from "next/navigation";

import { useAdminUsers } from "@/features/admin/hooks";
import { useUserActions } from "@/features/admin/user-actions";
import { dateTime, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";
import { Section } from "@/components/ops/primitives";

export default function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const users = useAdminUsers();
  const actions = useUserActions();

  const state = renderDetailState({ query: users, backHref: "/admin/users", backLabel: "All users", noun: "user" });
  if (state) return state;
  const u = users.data?.users.find((x) => x._id === userId);
  if (!u) return <DetailNotFound backHref="/admin/users" backLabel="All users" noun="user" />;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: u.email }]}
      eyebrow="Platform account"
      title={u.name}
      id={u._id}
      status={
        <div className="flex items-center gap-2">
          <StatusBadge status={u.active ? "active" : "suspended"} label={u.active ? "Active" : "Deactivated"} />
          {u.role === "owner" ? <Badge className="bg-brand-muted text-brand">Platform admin</Badge> : null}
        </div>
      }
      facts={[
        { label: "Email", value: u.email },
        { label: "Platform role", value: u.role === "owner" ? "Platform admin" : "Tenant" },
        { label: "Last login", value: u.lastLoginAt ? `${relativeTime(u.lastLoginAt)} · ${dateTime(u.lastLoginAt)}` : "Never" },
        { label: "Joined", value: dateTime(u.createdAt) },
      ]}
    >
      <Section title="Actions" description="Each takes effect immediately and is enforced by the API, not just this page.">
        <div className="flex flex-wrap gap-2">
          <Button variant={u.active ? "destructive" : "default"} size="sm" disabled={actions.pending} onClick={() => actions.toggleActive(u)}>
            {u.active ? "Deactivate account" : "Reactivate account"}
          </Button>
          <Button variant="outline" size="sm" disabled={actions.pending} onClick={() => actions.toggleRole(u)}>
            {u.role === "owner" ? "Demote to tenant" : "Promote to platform admin"}
          </Button>
          <Button variant="outline" size="sm" disabled={actions.pending} onClick={() => actions.resetPw(u)}>
            {actions.isSelf(u) ? "Change your password" : "Reset password"}
          </Button>
        </div>
        <p className="text-xs text-faint">
          Org memberships are managed by each organization&apos;s owners and admins.
        </p>
      </Section>
      {actions.reveal}
    </DetailPage>
  );
}
