"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UserPlusIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  CopyIcon,
  ChevronDownIcon,
} from "lucide-react";

import { useMe } from "@/features/auth/hooks";
import { useOrgCtx, RoleGate } from "@/features/orgs/org-context";
import {
  useMembers,
  useInvites,
  useCreateInvite,
  useRevokeInvite,
  useUpdateMember,
  useRemoveMember,
} from "@/features/orgs/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type { OrgRole } from "@/types";

const ROLE_HELP: Record<OrgRole, string> = {
  owner: "Billing, members, org settings — everything",
  admin: "Projects, keys, and team (except owners)",
  developer: "Build and observe — no secrets, no billing",
};

const InviteFormSchema = z.object({ email: z.string().email("Enter a valid email") });
type InviteValues = z.infer<typeof InviteFormSchema>;

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { org, role: myRole } = useOrgCtx();
  const createInvite = useCreateInvite(org.orgId);
  const [role, setRole] = useState<OrgRole>("developer");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(InviteFormSchema),
    defaultValues: { email: "" },
  });

  const serverError = createInvite.error instanceof ApiError ? createInvite.error.message : null;
  const assignable: OrgRole[] = myRole === "owner" ? ["developer", "admin", "owner"] : ["developer", "admin"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They&apos;ll get a link that&apos;s valid for 7 days.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            createInvite.mutate(
              { email: v.email, role },
              {
                onSuccess: (r) => {
                  reset();
                  onOpenChange(false);
                  if (r.emailSent) {
                    toast.success(`Invite emailed to ${r.invite.email}`);
                  } else if (r.inviteLink) {
                    void navigator.clipboard.writeText(r.inviteLink).catch(() => {});
                    toast.success("Invite link copied to clipboard", {
                      description: "Email isn't configured — share the link directly.",
                    });
                  }
                },
              },
            ),
          )}
        >
          {serverError ? (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? <p className="text-xs text-error">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="w-full justify-between">
                    <span className="capitalize">{role}</span>
                    <ChevronDownIcon className="text-faint" />
                  </Button>
                }
              />
              <DropdownMenuContent className="w-(--anchor-width)">
                {assignable.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                    <div className="flex flex-col">
                      <span className="capitalize">{r}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_HELP[r]}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-xs text-faint">{ROLE_HELP[role]}</p>
          </div>

          <Button type="submit" className="w-full" disabled={createInvite.isPending}>
            {createInvite.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Send invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { org, role: myRole, can } = useOrgCtx();
  const me = useMe();
  const members = useMembers(org.orgId);
  const invites = useInvites(org.orgId);
  const updateMember = useUpdateMember(org.orgId);
  const removeMember = useRemoveMember(org.orgId);
  const revokeInvite = useRevokeInvite(org.orgId);
  const [inviteOpen, setInviteOpen] = useState(false);

  const myUserId = me.data?.user.id;
  const pendingInvites = invites.data?.invites.filter((i) => i.status === "pending") ?? [];

  function onMutationError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Something went wrong");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Owners run the org, admins run the projects, developers build."
        action={
          can("org.members.manage") ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlusIcon />
              Invite
            </Button>
          ) : undefined
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Members</h2>
        {members.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members.data?.members ?? []).map((m) => {
                  const isSelf = m.userId === myUserId;
                  // Only owners touch owners; admins manage the rest.
                  const canEdit =
                    can("org.members.manage") && (m.role !== "owner" || myRole === "owner");
                  return (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {m.name ?? "Unknown"}
                            {isSelf ? (
                              <Badge variant="secondary" className="ml-2">
                                You
                              </Badge>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground">{m.email ?? m.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{m.role}</TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" aria-label="Member actions">
                                  <MoreHorizontalIcon />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Change role</DropdownMenuLabel>
                                {(myRole === "owner"
                                  ? (["owner", "admin", "developer"] as OrgRole[])
                                  : (["admin", "developer"] as OrgRole[])
                                )
                                  .filter((r) => r !== m.role)
                                  .map((r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      onClick={() =>
                                        updateMember.mutate(
                                          { userId: m.userId, role: r },
                                          { onError: onMutationError },
                                        )
                                      }
                                    >
                                      <span className="capitalize">Make {r}</span>
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  removeMember.mutate(m.userId, { onError: onMutationError })
                                }
                              >
                                {isSelf ? "Leave organization" : "Remove from organization"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <RoleGate min="admin">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-faint">Pending invites</h2>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell className="capitalize">{inv.role ?? "developer"}</TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status as Status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            revokeInvite.mutate(inv.id, {
                              onSuccess: () => toast.success("Invite revoked"),
                              onError: onMutationError,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      </RoleGate>

      {!can("org.members.manage") ? (
        <p className="flex items-center gap-1.5 text-xs text-faint">
          <CopyIcon className="size-3" aria-hidden />
          Ask an admin or owner to invite new teammates.
        </p>
      ) : null}
    </div>
  );
}
