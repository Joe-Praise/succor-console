"use client";

import { toast } from "sonner";
import { UsersIcon, MoreHorizontalIcon } from "lucide-react";

import { useAdminUsers, usePatchAdminUser } from "@/features/admin/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const patch = usePatchAdminUser();

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Platform accounts. Org membership is managed by each organization."
      />

      {users.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !users.data || users.data.users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users" description="Accounts appear here as people register." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Platform role</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "owner" ? (
                      <Badge className="bg-brand-muted text-brand">Platform admin</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Tenant</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <span className={u.active ? "text-sm text-success" : "text-sm text-error"}>
                      {u.active ? "Active" : "Deactivated"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="User actions">
                            <MoreHorizontalIcon />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() =>
                            patch.mutate(
                              { userId: u._id, active: !u.active },
                              {
                                onSuccess: () =>
                                  toast.success(u.active ? "Account deactivated" : "Account reactivated"),
                                onError,
                              },
                            )
                          }
                        >
                          {u.active ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            patch.mutate(
                              { userId: u._id, role: u.role === "owner" ? "tenant" : "owner" },
                              { onSuccess: () => toast.success("Platform role updated"), onError },
                            )
                          }
                        >
                          {u.role === "owner" ? "Demote to tenant" : "Promote to platform admin"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
