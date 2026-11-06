"use client";

import { UsersIcon, MoreHorizontalIcon } from "lucide-react";

import { useAdminUsers } from "@/features/admin/hooks";
import { useUserActions } from "@/features/admin/user-actions";
import { relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ops/data-table";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const actions = useUserActions();

  return (
    <div className="space-y-6">
      <PageHeader
        size="compact"
        title="Users"
        description="Platform accounts. Org membership is managed by each organization."
      />

      {users.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <DataTable
          rows={users.data?.users ?? []}
          getRowKey={(u) => u._id}
          getRowHref={(u) => `/admin/users/${u._id}`}
          getRowLabel={(u) => `Open user ${u.email}`}
          error={users.isError ? { message: "Couldn't load users.", onRetry: () => void users.refetch() } : null}
          empty={<EmptyState icon={UsersIcon} title="No users" description="Accounts appear here as people register." />}
          columns={[
            {
              id: "user",
              header: "User",
              cell: (u) => (
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{u.name}</span>
                  <span className="text-muted-foreground">{u.email}</span>
                </div>
              ),
            },
            {
              id: "role",
              header: "Platform role",
              cell: (u) =>
                u.role === "owner" ? (
                  <Badge className="bg-brand-muted text-brand">Platform admin</Badge>
                ) : (
                  <span className="text-muted-foreground">Tenant</span>
                ),
            },
            {
              id: "login",
              header: "Last login",
              cell: (u) => <span className="text-muted-foreground">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</span>,
            },
            { id: "status", header: "Status", cell: (u) => <StatusBadge status={u.active ? "active" : "suspended"} label={u.active ? "Active" : "Deactivated"} /> },
            {
              id: "actions",
              header: "",
              align: "right",
              interactive: true,
              cell: (u) => (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.email}`}>
                        <MoreHorizontalIcon />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => actions.toggleActive(u)}>
                      {u.active ? "Deactivate" : "Reactivate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.toggleRole(u)}>
                      {u.role === "owner" ? "Demote to tenant" : "Promote to platform admin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={actions.pending} onClick={() => actions.resetPw(u)}>
                      {actions.isSelf(u) ? "Change your password" : "Reset password"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
        />
      )}
      {actions.reveal}
    </div>
  );
}
