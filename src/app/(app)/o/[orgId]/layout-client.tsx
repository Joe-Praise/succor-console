"use client";

import Link from "next/link";
import { ClockIcon, OctagonAlertIcon, SearchXIcon } from "lucide-react";

import { OrgProvider, useOrgCtx } from "@/features/orgs/org-context";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** Banner surfaced on every org page while the org can't run agents. */
function OrgStatusBanner() {
  const { org } = useOrgCtx();

  if (org.status === "pending") {
    return (
      <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning">
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
      <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-error-bg px-4 py-3 text-sm text-error">
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
      <div className="mx-auto max-w-6xl">
        <OrgStatusBanner />
        {children}
      </div>
    </OrgProvider>
  );
}
