"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BoxesIcon, PlusIcon, Loader2Icon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog, useAgentRequests, useCreateAgentRequest } from "@/features/projects/hooks";
import { RoleGate } from "@/features/orgs/org-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
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
  const { projectId } = useProjectScope();
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
        description="The curated catalog — enabled agents run on this project today."
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <Card key={e.agentType} className="flex h-full flex-col">
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
              <CardContent className="flex-1">
                <p className="line-clamp-3 text-sm text-muted-foreground">{e.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!catalog.isLoading && entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No agents in this category.</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Your agent requests</h2>
        {requests.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : requests.data && requests.data.requests.length > 0 ? (
          <div className="space-y-2">
            {requests.data.requests.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.description}</p>
                </div>
                <StatusBadge status={(r.status ?? "pending") as Status} />
              </div>
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
