"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRoundIcon, PlusIcon, Loader2Icon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useKeys, useMintKey, useRevokeKey } from "@/features/projects/hooks";
import { RoleGate } from "@/features/orgs/org-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { SecretReveal } from "@/components/secret-reveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ops/data-table";
import { relativeTime } from "@/lib/format";
import { ApiError } from "@/api/client";

const NameSchema = z.object({ name: z.string().min(1, "Name the key").max(80) });
type NameValues = z.infer<typeof NameSchema>;

export default function KeysPage() {
  const { orgId, projectId } = useProjectScope();
  const keys = useKeys(projectId);
  const mint = useMintKey(projectId);
  const revoke = useRevokeKey(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [minted, setMinted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameValues>({ resolver: zodResolver(NameSchema), defaultValues: { name: "" } });

  const serverError = mint.error instanceof ApiError ? mint.error.message : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="API keys"
        description="Project-scoped, hashed at rest, shown once. Send as `Authorization: Bearer …`."
        action={
          <RoleGate min="admin">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <PlusIcon />
              New key
            </Button>
          </RoleGate>
        }
      />

      {keys.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : !keys.data || keys.data.keys.length === 0 ? (
        <EmptyState
          icon={KeyRoundIcon}
          title="No API keys yet"
          description="Mint a key so your backend can call agents on this project."
          action={
            <RoleGate min="admin">
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <PlusIcon />
                Create key
              </Button>
            </RoleGate>
          }
        />
      ) : (
        <DataTable
          rows={keys.data.keys}
          getRowKey={(k) => k.id}
          getRowHref={(k) => `/o/${orgId}/p/${projectId}/keys/${k.id}`}
          getRowLabel={(k) => `Open API key ${k.name}`}
          columns={[
            { id: "name", header: "Name", cell: (k) => <span className="font-medium text-foreground">{k.name}</span> },
            { id: "key", header: "Key", cell: (k) => <span className="font-mono text-xs text-muted-foreground">{k.prefix}…{k.last4}</span> },
            {
              id: "used",
              header: "Last used",
              cell: (k) => <span className="text-muted-foreground">{k.lastUsedAt ? relativeTime(k.lastUsedAt) : "Never"}</span>,
            },
            { id: "status", header: "Status", cell: (k) => <StatusBadge status={k.revokedAt ? "revoked" : "active"} /> },
            {
              id: "actions",
              header: "",
              align: "right",
              interactive: true,
              cell: (k) =>
                !k.revokedAt ? (
                  <RoleGate min="admin">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        if (!window.confirm(`Revoke "${k.name}"? Calls using it fail immediately.`)) return;
                        revoke.mutate(k.id, {
                          onSuccess: () => toast.success("Key revoked"),
                          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Revoke failed"),
                        });
                      }}
                    >
                      Revoke
                    </Button>
                  </RoleGate>
                ) : null,
            },
          ]}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>
              The full key is shown exactly once after creation.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((v) =>
              mint.mutate(v.name, {
                onSuccess: (r) => {
                  reset();
                  setDialogOpen(false);
                  setMinted(r.key.fullKey);
                },
              }),
            )}
          >
            {serverError ? (
              <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="Production"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={mint.isPending}>
              {mint.isPending ? <Loader2Icon className="animate-spin" /> : null}
              Create key
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {minted ? (
        <SecretReveal
          open={!!minted}
          onOpenChange={(open) => {
            if (!open) setMinted(null);
          }}
          secret={minted}
          label="API key"
          prefix="ask_live_"
        />
      ) : null}
    </div>
  );
}
