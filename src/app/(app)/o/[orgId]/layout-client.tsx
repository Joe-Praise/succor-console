"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon, OctagonAlertIcon, SearchXIcon } from "lucide-react";

import { OrgProvider, useOrgCtx } from "@/features/orgs/org-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { pageLayout } from "@/lib/nav";

/** Banner surfaced on every org page while the org can't run agents. */
function OrgStatusBanner() {
  const { org } = useOrgCtx();

  if (org.status === "pending") {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning">
        <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-medium">Awaiting approval.</span> You can set everything up
          now — projects, keys, team — but agents only run once your organization is approved.
        </p>
      </div>
    );
  }
  if (org.status === "suspended") {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-error/25 bg-error-bg px-3.5 py-2.5 text-[13px] text-error">
        <OctagonAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-medium">Organization suspended.</span> Agent calls are
          rejected while suspended — contact support if you believe this is a mistake.
        </p>
      </div>
    );
  }
  return null;
}

export function OrgLayoutClient({
  orgId,
  children,
}: {
  orgId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const layout = pageLayout(pathname);
  return (
    <OrgProvider
      orgId={orgId}
      fallback={
        <div className="mx-auto max-w-2xl py-16">
          <EmptyState
            icon={SearchXIcon}
            title="Organization not found"
            description="It doesn't exist, or you don't have access to it."
            action={
              <Button size="sm" render={<Link href="/dashboard">Back to dashboard</Link>} />
            }
          />
        </div>
      }
    >
      {layout === "page" ? (
        <div className="mx-auto max-w-350">
          <OrgStatusBanner />
          {children}
        </div>
      ) : (
        <div className={layout === "canvas" ? "flex h-full flex-col" : undefined}>
          <OrgStatusBanner />
          {children}
        </div>
      )}
    </OrgProvider>
  );
}
