"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/api/client";
import { useChangePassword } from "@/features/auth/hooks";
import { newPasswordSchema } from "@/lib/password-policy";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Must be different from your current password",
  });
type Values = z.infer<typeof schema>;

const EMPTY: Values = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Change the signed-in user's password. Requires the current password (a
 * session alone can't change it); the server signs out every OTHER session,
 * while the BFF swaps this one's cookie so the user stays signed in here.
 */
export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const change = useChangePassword();

  const serverError =
    change.error instanceof ApiError
      ? change.error.message
      : change.error
        ? "Something went wrong. Try again."
        : null;

  return (
    <form
      noValidate
      className="max-w-md space-y-4"
      onSubmit={handleSubmit((v) =>
        change.mutate(
          { currentPassword: v.currentPassword, newPassword: v.newPassword },
          {
            onSuccess: () => {
              reset(EMPTY);
              toast.success("Password updated. Your other sessions have been signed out.");
            },
          },
        ),
      )}
    >
      {serverError ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <p className="text-xs text-error">{errors.currentPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...register("newPassword")}
        />
        {errors.newPassword ? (
          <p className="text-xs text-error">{errors.newPassword.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-error">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={change.isPending}>
        {change.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
