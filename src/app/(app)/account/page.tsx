"use client";

import { useMe } from "@/features/auth/hooks";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  const me = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Account" description="Your personal sign-in details." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {me.isLoading || !me.data ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{me.data.user.name}</span>
              <span className="text-sm text-muted-foreground">{me.data.user.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing your password signs you out everywhere else. You stay signed in here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
