"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@/features/auth/hooks";
import { resolveLanding } from "@/features/auth/landing";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback resolver — normal logins never come here (the auth hooks resolve
 * the landing BEFORE navigating). This only catches direct /dashboard hits and
 * the proxy's authed-user-on-/login bounce, and forwards them to the same
 * destination logic.
 */
export default function DashboardPage() {
  const { data, isLoading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !data) return;
    router.replace(resolveLanding(data));
  }, [data, isLoading, router]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
