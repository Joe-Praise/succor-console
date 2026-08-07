"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@/features/auth/hooks";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Platform-admin gate. The cookie-presence proxy can't check roles, so the
 * layout re-verifies via /auth/me — non-admins bounce to their dashboard.
 * (The backend enforces requireOwner on every /admin-api call regardless.)
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && data && !data.isPlatformAdmin) router.replace("/dashboard");
  }, [data, isLoading, router]);

  if (isLoading || !data || !data.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return <div className="mx-auto max-w-6xl">{children}</div>;
}
