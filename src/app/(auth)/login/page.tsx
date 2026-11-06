import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="display text-[32px] text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to {PRODUCT_NAME}.</p>
      </div>
      <LoginForm />
    </div>
  );
}
