"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/api/client";
import { useForgotPassword } from "@/features/auth/hooks";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

/**
 * Request a reset link. The confirmation is deliberately the same whether or
 * not the address has an account — the service never says which.
 */
export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const forgot = useForgotPassword();

  if (forgot.isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <MailCheckIcon className="mx-auto size-8 text-brand" aria-hidden />
        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-foreground" style={{ fontWeight: 500 }}>
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="text-foreground">{getValues("email")}</span>,
            we&apos;ve sent a link to reset your password. It expires in 30 minutes.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => forgot.reset()}>
          Use a different email
        </Button>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  const serverError =
    forgot.error instanceof ApiError
      ? forgot.error.message
      : forgot.error
        ? "Something went wrong. Try again."
        : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-serif text-2xl text-foreground" style={{ fontWeight: 500 }}>
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit((v) => forgot.mutate(v.email))} className="space-y-4" noValidate>
        {serverError ? (
          <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email ? <p className="text-xs text-error">{errors.email.message}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={forgot.isPending}>
          {forgot.isPending ? <Loader2Icon className="animate-spin" /> : null}
          Send reset link
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
