"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { usePatchAdminUser, useResetAdminUserPassword } from "@/features/admin/hooks";
import { useMe } from "@/features/auth/hooks";
import { ApiError } from "@/api/client";
import type { AdminUser } from "@/api/admin";
import { SecretReveal } from "@/components/secret-reveal";

/**
 * The three platform-admin actions on a user, shared by the users table (menu) and
 * the user page (buttons). Every action is a real API mutation with confirmation
 * where it's disruptive; the generated password is shown once and never stored.
 */
export function useUserActions() {
  const patch = usePatchAdminUser();
  const resetPassword = useResetAdminUserPassword();
  const me = useMe();
  const router = useRouter();
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Action failed");

  const toggleActive = (u: AdminUser) => {
    if (u.active && !window.confirm(`Deactivate ${u.name}? They are signed out and can't sign in until reactivated.`)) return;
    patch.mutate(
      { userId: u._id, active: !u.active },
      { onSuccess: () => toast.success(u.active ? "Account deactivated" : "Account reactivated"), onError },
    );
  };

  const toggleRole = (u: AdminUser) => {
    const promote = u.role !== "owner";
    if (!window.confirm(promote ? `Make ${u.name} a platform admin? They'll see every tenant.` : `Demote ${u.name} to tenant?`)) return;
    patch.mutate(
      { userId: u._id, role: promote ? "owner" : "tenant" },
      { onSuccess: () => toast.success("Platform role updated"), onError },
    );
  };

  const resetPw = (u: AdminUser) => {
    if (u._id === me.data?.user.id) {
      // Resetting your own would revoke this session — use the current-password flow.
      router.push("/account");
      return;
    }
    if (
      !window.confirm(
        `Reset the password for ${u.name} (${u.email})? Their current password stops working and they're signed out everywhere.`,
      )
    )
      return;
    resetPassword.mutate(u._id, {
      onSuccess: (res) => setIssued({ email: u.email, password: res.password }),
      onError,
    });
  };

  const reveal = issued ? (
    <SecretReveal
      open={!!issued}
      onOpenChange={(open) => {
        if (!open) setIssued(null);
      }}
      secret={issued.password}
      label="temporary password"
      title={`New password for ${issued.email}`}
      confirmLabel="I've shared it securely"
    />
  ) : null;

  return {
    toggleActive,
    toggleRole,
    resetPw,
    isSelf: (u: AdminUser) => u._id === me.data?.user.id,
    pending: patch.isPending || resetPassword.isPending,
    reveal,
  };
}
