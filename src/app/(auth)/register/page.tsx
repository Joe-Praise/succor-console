import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1
          className="font-serif text-2xl text-foreground"
          style={{ fontWeight: 500 }}
        >
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start plugging agents into your app.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
