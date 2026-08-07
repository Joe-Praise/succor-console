"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/api/client";
import { useLogin } from "@/features/auth/hooks";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const login = useLogin();

  const serverError =
    login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? "Something went wrong. Try again."
        : null;

  return (
    <form
      onSubmit={handleSubmit((v) => login.mutate(v))}
      className="space-y-4"
      noValidate
    >
      {serverError ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">
          {serverError}
        </p>
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
        {errors.email ? (
          <p className="text-xs text-error">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-error">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="text-brand hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
