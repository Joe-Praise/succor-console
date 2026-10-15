import { Suspense } from "react";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

// The URL carries a live reset token: never leak it via the Referer header.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
