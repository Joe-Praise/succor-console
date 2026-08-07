"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon, MailIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { useAcceptInvite } from "@/features/orgs/hooks";

function InviteInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const accept = useAcceptInvite();

  const serverError =
    accept.error instanceof ApiError
      ? accept.error.message
      : accept.error
        ? "Something went wrong. Try again."
        : null;

  if (!token) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        This invite link is missing its token — ask for a fresh link.
      </p>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-1">
        <MailIcon className="mx-auto size-8 text-brand" aria-hidden />
        <h1 className="font-serif text-2xl text-foreground" style={{ fontWeight: 500 }}>
          Join an organization
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited to collaborate. Accept to get access.
        </p>
      </div>

      {serverError ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
      ) : null}

      <Button
        className="w-full"
        disabled={accept.isPending}
        onClick={() =>
          accept.mutate(token, {
            onSuccess: (r) => router.replace(`/o/${r.orgId}`),
          })
        }
      >
        {accept.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Accept invitation
      </Button>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteInner />
    </Suspense>
  );
}
