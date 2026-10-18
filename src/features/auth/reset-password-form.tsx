"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheckIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/api/client";
import { useResetPassword } from "@/features/auth/hooks";
import { newPasswordSchema } from "@/lib/password-policy";

const schema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
type Values = z.infer<typeof schema>;

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1 text-center">
      <h1 className="font-serif text-2xl text-foreground" style={{ fontWeight: 500 }}>
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/**
 * Redeem an emailed reset link (`?token=…`). Must render inside <Suspense>
 * (useSearchParams). On success every session is revoked, so the user signs in
 * fresh with the new password.
 */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="space-y-6">
        <Heading title="Link incomplete" body="This reset link is missing its token." />
        <Button className="w-full" render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </div>
    );
  }

  if (reset.isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <CircleCheckIcon className="mx-auto size-8 text-success" aria-hidden />
        <Heading
          title="Password updated"
          body="You've been signed out everywhere. Sign in with your new password."
        />
        <Button className="w-full" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    );
  }

  const serverError =
    reset.error instanceof ApiError
      ? reset.error.message
      : reset.error
        ? "Something went wrong. Try again."
        : null;

  return (
    <div className="space-y-6">
      <Heading title="Choose a new password" body="Pick something you don't use anywhere else." />

      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) => reset.mutate({ token, newPassword: v.newPassword }))}
      >
        {serverError ? (
          <div className="space-y-1 rounded-lg bg-error-bg px-3 py-2 text-sm text-error">
            <p>{serverError}</p>
            {reset.error instanceof ApiError && reset.error.status === 400 ? (
              <Link href="/forgot-password" className="underline">
                Request a new link
              </Link>
            ) : null}
          </div>
        ) : null}

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

        <Button type="submit" className="w-full" disabled={reset.isPending}>
          {reset.isPending ? <Loader2Icon className="animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </div>
  );
}
