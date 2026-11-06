"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BoxesIcon, PlusIcon, Loader2Icon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog, useAgentRequests, useCreateAgentRequest } from "@/features/projects/hooks";
import { RoleGate } from "@/features/orgs/org-context";
import { RequestTimeline } from "@/features/agents/request-timeline";
import { CapabilityBadges } from "@/features/agents/capability-badges";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/api/client";

const CATEGORIES = ["all", "seo", "content", "analysis", "elearning", "vision"] as const;

const RequestSchema = z.object({
  title: z.string().min(1, "Give it a short title").max(120),
  description: z.string().min(1, "Describe what the agent should do").max(4000),
  desiredInputs: z.string().max(4000).optional(),
  desiredCallback: z.string().max(4000).optional(),
});
type RequestValues = z.infer<typeof RequestSchema>;

function RequestAgentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { projectId } = useProjectScope();
  const createRequest = useCreateAgentRequest(projectId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestValues>({
    resolver: zodResolver(RequestSchema),
    defaultValues: { title: "", description: "", desiredInputs: "", desiredCallback: "" },
  });

  const serverError = createRequest.error instanceof ApiError ? createRequest.error.message : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a custom agent</DialogTitle>
          <DialogDescription>
            Tell us what it should do and what your callback should receive — we scope it
            with you, build it, and publish it to your catalog.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            createRequest.mutate(v, {
              onSuccess: () => {
                reset();
                onOpenChange(false);
                toast.success("Request submitted — we'll review it shortly.");
              },
            }),
          )}
        >
          {serverError ? (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="req-title">Title</Label>
            <Input id="req-title" aria-invalid={!!errors.title} {...register("title")} />
            {errors.title ? <p className="text-xs text-error">{errors.title.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-desc">What should it do?</Label>
            <Textarea id="req-desc" rows={3} aria-invalid={!!errors.description} {...register("description")} />
            {errors.description ? (
              <p className="text-xs text-error">{errors.description.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-inputs">Inputs you can provide (optional)</Label>
            <Textarea id="req-inputs" rows={2} {...register("desiredInputs")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-callback">Callback shape you expect (optional)</Label>
            <Textarea id="req-callback" rows={2} {...register("desiredCallback")} />
          </div>
          <Button type="submit" className="w-full" disabled={createRequest.isPending}>
            {createRequest.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Submit request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const { orgId, projectId } = useProjectScope();
  const catalog = useCatalog(projectId);
  const requests = useAgentRequests(projectId);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [requestOpen, setRequestOpen] = useState(false);

  const entries =
    catalog.data?.catalog.filter((e) => category === "all" || e.category === category) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agents"
        description="Production agents, each with a typed request, a validated output and a callback contract. Enabled agents run on this project today."
        action={
          <RoleGate min="admin">
            <Button size="sm" onClick={() => setRequestOpen(true)}>
              <PlusIcon />
              Request an agent
            </Button>
          </RoleGate>
        }
      />

      <Tabs value={category} onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c} className="capitalize">
              {c === "elearning" ? "E-learning" : c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {catalog.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : catalog.isError ? (
        <QueryError message="Couldn't load the catalog." onRetry={() => void catalog.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <Card
              key={e.agentType}
              className="relative flex h-full flex-col transition-colors hover:border-strong focus-within:border-strong"
            >
              <Link
                href={`/o/${orgId}/p/${projectId}/agents/${e.agentType}`}
                aria-label={`Open ${e.name}`}
                className="absolute inset-0 z-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{e.name}</CardTitle>
                  {e.enabledForProject ? (
                    <Badge className="shrink-0 bg-success-bg text-success">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      Not enabled
                    </Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">{e.agentType}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">{e.description}</p>
                <CapabilityBadges entry={e} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!catalog.isLoading && !catalog.isError && entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No agents in this category.</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Your agent requests</h2>
        {requests.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : requests.isError ? (
          <QueryError
            message="Couldn't load your requests."
            onRetry={() => void requests.refetch()}
          />
        ) : requests.data && requests.data.requests.length > 0 ? (
          <div className="space-y-2">
            {requests.data.requests.map((r) => (
              <Link
                key={r._id}
                href={`/o/${orgId}/p/${projectId}/agents/requests/${r._id}`}
                className="block space-y-3 tile px-4 py-3 transition-colors hover:border-strong"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.description}</p>
                </div>
                <RequestTimeline status={r.status ?? "pending"} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BoxesIcon className="size-4" aria-hidden />
            Need something the catalog doesn&apos;t cover? Request a custom agent.
          </p>
        )}
      </section>

      <RequestAgentDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}
