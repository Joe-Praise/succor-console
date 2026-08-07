"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2Icon, ChevronDownIcon } from "lucide-react";

import { useOrgCtx, RoleGate } from "@/features/orgs/org-context";
import {
  useUpdateOrg,
  useDeleteOrg,
  useMembers,
  useTransferOwnership,
} from "@/features/orgs/hooks";
import { useMe } from "@/features/auth/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/api/client";

const SettingsSchema = z.object({
  name: z.string().min(1, "Required"),
  billingEmail: z.string().email("Enter a valid email"),
});
type SettingsValues = z.infer<typeof SettingsSchema>;

function GeneralSettings() {
  const { org } = useOrgCtx();
  const updateOrg = useUpdateOrg(org.orgId);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(SettingsSchema),
    // billingEmail isn't in the /me payload — filled after first save; the
    // backend keeps the stored value when the field is omitted.
    defaultValues: { name: org.name, billingEmail: "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          The organization ID (<span className="font-mono">{org.orgId}</span>) is permanent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="max-w-md space-y-4"
          onSubmit={handleSubmit((v) =>
            updateOrg.mutate(
              { name: v.name, ...(v.billingEmail ? { billingEmail: v.billingEmail } : {}) },
              {
                onSuccess: () => toast.success("Organization updated"),
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Update failed"),
              },
            ),
          )}
        >
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-billing-email">Billing email</Label>
            <Input
              id="org-billing-email"
              type="email"
              placeholder="Leave blank to keep the current address"
              aria-invalid={!!errors.billingEmail}
              {...register("billingEmail")}
            />
            {errors.billingEmail ? (
              <p className="text-xs text-error">{errors.billingEmail.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={updateOrg.isPending || !isDirty}>
            {updateOrg.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const { org } = useOrgCtx();
  const router = useRouter();
  const me = useMe();
  const members = useMembers(org.orgId);
  const transfer = useTransferOwnership(org.orgId);
  const deleteOrg = useDeleteOrg(org.orgId);

  const others = (members.data?.members ?? []).filter((m) => m.userId !== me.data?.user.id);

  return (
    <Card className="border-error/30">
      <CardHeader>
        <CardTitle className="text-error">Danger zone</CardTitle>
        <CardDescription>These actions are hard to undo. Read twice, click once.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Transfer ownership</p>
            <p className="text-sm text-muted-foreground">
              Make another member the owner — you become an admin.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={others.length === 0}>
                  Choose member
                  <ChevronDownIcon className="text-faint" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              {others.map((m) => (
                <DropdownMenuItem
                  key={m.userId}
                  onClick={() =>
                    transfer.mutate(m.userId, {
                      onSuccess: () => toast.success(`Ownership transferred to ${m.name ?? m.email}`),
                      onError: (err) =>
                        toast.error(err instanceof ApiError ? err.message : "Transfer failed"),
                    })
                  }
                >
                  <div className="flex flex-col">
                    <span>{m.name ?? "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium text-foreground">Delete organization</p>
            <p className="text-sm text-muted-foreground">
              Blocked while any invoice is unpaid. Projects stop running immediately.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteOrg.isPending}
            onClick={() => {
              if (!window.confirm(`Delete "${org.name}"? This can't be undone from the portal.`)) return;
              deleteOrg.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Organization deleted");
                  router.replace("/dashboard");
                },
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Delete failed"),
              });
            }}
          >
            Delete organization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrgSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Organization settings" />
      <RoleGate
        min="owner"
        fallback={
          <p className="text-sm text-muted-foreground">
            Only the organization owner can change these settings.
          </p>
        }
      >
        <div className="space-y-6">
          <GeneralSettings />
          <DangerZone />
        </div>
      </RoleGate>
    </div>
  );
}
