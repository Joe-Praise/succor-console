"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useUpdateProject } from "@/features/projects/hooks";
import { RoleGate } from "@/features/orgs/org-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/api/client";

const SettingsSchema = z.object({
  name: z.string().min(1, "Required"),
  apiBaseUrls: z
    .array(
      z.object({
        label: z.string().min(1, "Required"),
        url: z.string().url("Enter the full URL"),
      }),
    )
    .min(1, "At least one URL is required"),
});
type SettingsValues = z.infer<typeof SettingsSchema>;

function SettingsForm() {
  const { orgId, projectId, project } = useProjectScope();
  const update = useUpdateProject(orgId, projectId);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: project?.name ?? projectId,
      apiBaseUrls: [{ label: "production", url: "" }],
    },
  });
  const urls = useFieldArray({ control, name: "apiBaseUrls" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>
          The project ID (<span className="font-mono">{projectId}</span>) is permanent.
          Base URLs are where agents deliver callbacks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="max-w-xl space-y-5"
          onSubmit={handleSubmit((v) =>
            update.mutate(v, {
              onSuccess: () => toast.success("Project updated"),
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Update failed"),
            }),
          )}
        >
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Project name</Label>
            <Input id="p-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>API base URLs</Label>
            {urls.fields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  placeholder="production"
                  className="w-32"
                  aria-invalid={!!errors.apiBaseUrls?.[i]?.label}
                  {...register(`apiBaseUrls.${i}.label`)}
                />
                <Input
                  placeholder="https://yourapp.com"
                  type="url"
                  aria-invalid={!!errors.apiBaseUrls?.[i]?.url}
                  {...register(`apiBaseUrls.${i}.url`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove URL"
                  disabled={urls.fields.length === 1}
                  onClick={() => urls.remove(i)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => urls.append({ label: "", url: "" })}
            >
              <PlusIcon />
              Add environment
            </Button>
            <p className="text-xs text-faint">
              Saving replaces the full list — include every environment you use.
            </p>
          </div>

          <Button type="submit" disabled={update.isPending || !isDirty}>
            {update.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ProjectSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Project settings" />
      <RoleGate
        min="admin"
        fallback={
          <p className="text-sm text-muted-foreground">
            Only org admins and owners can change project settings.
          </p>
        }
      >
        <SettingsForm />
      </RoleGate>
    </div>
  );
}
