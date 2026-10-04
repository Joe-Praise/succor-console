"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecretReveal } from "@/components/secret-reveal";
import { ApiError } from "@/api/client";
import { useCreateOrg, useCreateProject } from "@/features/orgs/hooks";

const SLUG = /^[a-z0-9-]+$/;

function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ---------------------------------------------------------------------------
// Step 1 — organization
// ---------------------------------------------------------------------------

const OrgSchema = z.object({
  name: z.string().min(1, "Give your organization a name"),
  orgId: z
    .string()
    .min(3, "At least 3 characters")
    .max(40)
    .regex(SLUG, "Lowercase letters, numbers, and hyphens only"),
  billingEmail: z.string().email("Enter a valid email"),
});
type OrgValues = z.infer<typeof OrgSchema>;

function OrgStep({ onDone }: { onDone: (orgId: string) => void }) {
  const createOrg = useCreateOrg();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<OrgValues>({
    resolver: zodResolver(OrgSchema),
    defaultValues: { name: "", orgId: "", billingEmail: "" },
  });

  const serverError = createOrg.error instanceof ApiError ? createOrg.error.message : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        createOrg.mutate(v, { onSuccess: (r) => onDone(r.org.orgId) }),
      )}
    >
      {serverError ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          placeholder="Acme Inc."
          aria-invalid={!!errors.name}
          {...register("name", {
            onChange: (e) => {
              if (!dirtyFields.orgId) setValue("orgId", slugify(e.target.value));
            },
          })}
        />
        {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-id">Organization ID</Label>
        <Input
          id="org-id"
          placeholder="acme-inc"
          className="font-mono"
          aria-invalid={!!errors.orgId}
          {...register("orgId")}
        />
        <p className="text-xs text-faint">Permanent — used in URLs and the API.</p>
        {errors.orgId ? <p className="text-xs text-error">{errors.orgId.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="billing-email">Billing email</Label>
        <Input
          id="billing-email"
          type="email"
          placeholder="finance@acme.com"
          aria-invalid={!!errors.billingEmail}
          {...register("billingEmail")}
        />
        {errors.billingEmail ? (
          <p className="text-xs text-error">{errors.billingEmail.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={createOrg.isPending}>
        {createOrg.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Create organization
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — first project
// ---------------------------------------------------------------------------

const ProjectSchema = z.object({
  name: z.string().min(1, "Give your project a name"),
  projectId: z
    .string()
    .min(1, "Required")
    .regex(SLUG, "Lowercase letters, numbers, and hyphens only"),
  apiBaseUrl: z.string().url("Enter the full URL, including https://"),
});
type ProjectValues = z.infer<typeof ProjectSchema>;

function ProjectStep({
  orgId,
  onDone,
}: {
  orgId: string;
  onDone: (projectId: string, callbackKey: string) => void;
}) {
  const createProject = useCreateProject(orgId);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ProjectValues>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: { name: "", projectId: "", apiBaseUrl: "" },
  });

  const serverError = createProject.error instanceof ApiError ? createProject.error.message : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        createProject.mutate(
          {
            projectId: v.projectId,
            name: v.name,
            apiBaseUrls: [{ label: "production", url: v.apiBaseUrl }],
          },
          { onSuccess: (r) => onDone(r.project.projectId, r.agentApiKey) },
        ),
      )}
    >
      {serverError ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          placeholder="Main website"
          aria-invalid={!!errors.name}
          {...register("name", {
            onChange: (e) => {
              if (!dirtyFields.projectId) setValue("projectId", slugify(e.target.value));
            },
          })}
        />
        {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-id">Project ID</Label>
        <Input
          id="project-id"
          placeholder="main-website"
          className="font-mono"
          aria-invalid={!!errors.projectId}
          {...register("projectId")}
        />
        {errors.projectId ? (
          <p className="text-xs text-error">{errors.projectId.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="api-base-url">Your API base URL</Label>
        <Input
          id="api-base-url"
          type="url"
          placeholder="https://yourapp.com"
          aria-invalid={!!errors.apiBaseUrl}
          {...register("apiBaseUrl")}
        />
        <p className="text-xs text-faint">
          Where agents deliver results — your callback endpoints live under this host.
        </p>
        {errors.apiBaseUrl ? (
          <p className="text-xs text-error">{errors.apiBaseUrl.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={createProject.isPending}>
        {createProject.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Create project
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;

const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "Organization" },
  { n: 2, label: "First project" },
  { n: 3, label: "Callback key" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [callbackKey, setCallbackKey] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* step indicator */}
      <ol className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-medium",
                step > s.n
                  ? "bg-success text-white"
                  : step === s.n
                    ? "bg-brand text-brand-foreground"
                    : "bg-raised text-faint",
              )}
            >
              {step > s.n ? <CheckIcon className="size-3.5" /> : s.n}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                step === s.n ? "text-foreground" : "text-faint",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px w-6 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <Card>
        {step === 1 ? (
          <>
            <CardHeader>
              <CardTitle>Create your organization</CardTitle>
              <CardDescription>
                The account your team, projects, and billing live under.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgStep
                onDone={(id) => {
                  setOrgId(id);
                  setStep(2);
                }}
              />
            </CardContent>
          </>
        ) : step === 2 && orgId ? (
          <>
            <CardHeader>
              <CardTitle>Create your first project</CardTitle>
              <CardDescription>
                Each project gets its own API keys, budget cap, and invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectStep
                orgId={orgId}
                onDone={(pid, key) => {
                  setProjectId(pid);
                  setCallbackKey(key);
                  setStep(3);
                  setRevealOpen(true);
                }}
              />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Almost there</CardTitle>
              <CardDescription>
                Your organization is pending approval — you can explore the console now;
                agents run once it&apos;s approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {callbackKey ? (
                <Button variant="outline" className="w-full" onClick={() => setRevealOpen(true)}>
                  Show callback key again
                </Button>
              ) : null}
              <Button
                className="w-full"
                onClick={() => router.push(`/o/${orgId}${projectId ? `/p/${projectId}` : ""}`)}
              >
                Go to your project
              </Button>
            </CardContent>
          </>
        )}
      </Card>

      {callbackKey ? (
        <SecretReveal
          open={revealOpen}
          onOpenChange={setRevealOpen}
          secret={callbackKey}
          label="callback key"
          prefix="cbk_"
        />
      ) : null}
    </div>
  );
}
