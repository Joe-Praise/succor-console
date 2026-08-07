"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useProjectSetup, useCurrentUsage } from "@/features/projects/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { StatusBadge, type Status } from "@/components/ui/status-badge";

function EnvBlock({ env }: { env: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  const block = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
        {block}
      </pre>
      <Button
        variant="outline"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label="Copy env block"
        onClick={() => {
          void navigator.clipboard
            .writeText(block)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => toast.error("Couldn't copy — select the text manually"));
        }}
      >
        {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      </Button>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { orgId, projectId, project } = useProjectScope();
  const setup = useProjectSetup(projectId);
  const usage = useCurrentUsage(projectId);

  return (
    <div className="space-y-8">
      <PageHeader
        title={project?.name ?? projectId}
        description="Connection details, this month's spend, and what's enabled."
        action={
          setup.data ? (
            <StatusBadge
              status={
                (["approved", "pending", "suspended"].includes(setup.data.status)
                  ? setup.data.status
                  : "draft") as Status
              }
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend this month</CardTitle>
            <CardDescription>Billed usage against the project&apos;s budget cap.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.data ? (
              <div className="space-y-3">
                <BudgetMeter
                  spent={usage.data.billedUsd}
                  budget={usage.data.monthlyBudgetUsd}
                />
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    <span className="font-medium tabular-nums text-foreground">
                      {usage.data.runs}
                    </span>{" "}
                    runs
                  </span>
                  <span>
                    <span className="font-medium tabular-nums text-foreground">
                      {(usage.data.inputTokens + usage.data.outputTokens).toLocaleString()}
                    </span>{" "}
                    tokens
                  </span>
                </div>
              </div>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enabled agents</CardTitle>
            <CardDescription>What this project can run right now.</CardDescription>
          </CardHeader>
          <CardContent>
            {setup.data ? (
              <div className="space-y-3">
                <p className="text-2xl font-medium tabular-nums text-foreground">
                  {setup.data.enabledAgents.length}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/o/${orgId}/p/${projectId}/agents`}>Browse the catalog</Link>}
                />
              </div>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connect your app</CardTitle>
          <CardDescription>
            Drop these into your backend&apos;s environment. Mint the API key on the{" "}
            <Link href={`/o/${orgId}/p/${projectId}/keys`} className="text-brand hover:underline">
              API keys
            </Link>{" "}
            tab; the callback key was shown once at project creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {setup.data ? (
            <EnvBlock env={setup.data.env} />
          ) : (
            <Skeleton className="h-24 w-full rounded-lg" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
