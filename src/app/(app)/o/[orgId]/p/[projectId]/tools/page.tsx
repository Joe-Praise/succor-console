"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  KeyRoundIcon,
  Loader2Icon,
  PlugZapIcon,
  PlusIcon,
  ServerIcon,
  ShieldCheckIcon,
  Trash2Icon,
  LockKeyholeIcon,
  BotIcon,
  CheckIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog } from "@/features/projects/hooks";
import {
  useCreateToolGrant,
  useDeleteMcpServer,
  useMcpServers,
  useRegisterMcpServer,
  useRevokeToolGrant,
  useToolGrants,
  useUpdateMcpServer,
} from "@/features/tools/hooks";
import { RoleGate, useOrgCtx } from "@/features/orgs/org-context";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";
import { SIDE_EFFECT_CLASSES, type McpServer, type SideEffectClass } from "@/types";
import { PageHeader } from "@/components/page-header";
import { JsonPanel } from "@/components/json-panel";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Grant refusal reasons → plain language (agent-service lib/tool-grants.ts). */
const REFUSAL_COPY: Record<string, string> = {
  "unknown-agent": "That agent isn't in the catalog.",
  "agent-not-enabled": "That agent isn't enabled on this project.",
  "server-not-found": "That server doesn't exist in this project.",
  "server-disabled": "That server is disabled — enable it first.",
  "tool-not-exposed": "The server's allowlist doesn't expose that tool.",
  "invalid-schema": "The parameters schema isn't a valid, object-shaped JSON Schema.",
  duplicate: "An active grant for this agent + server + tool already exists.",
};

const CLASS_COPY: Record<SideEffectClass, { label: string; note: string; runnable: boolean }> = {
  READ_ONLY: { label: "Read-only", note: "Executable. The only class the runtime will call.", runnable: true },
  IDEMPOTENT_WRITE: { label: "Idempotent write", note: "Recorded, not yet runnable.", runnable: false },
  NON_IDEMPOTENT_WRITE: { label: "Non-idempotent write", note: "Recorded, not runnable.", runnable: false },
  UNKNOWN: { label: "Unknown", note: "Refused at execution.", runnable: false },
};

const SCHEMA_TEMPLATE = `{
  "type": "object",
  "properties": {
    "courseId": { "type": "string" }
  },
  "required": ["courseId"],
  "additionalProperties": false
}`;

function errMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const reason = (err.data as { reason?: string } | undefined)?.reason;
    if (reason && REFUSAL_COPY[reason]) return REFUSAL_COPY[reason];
    return err.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// MCP servers
// ---------------------------------------------------------------------------

function RegisterServerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { projectId } = useProjectScope();
  const register = useRegisterMcpServer(projectId);
  const [form, setForm] = useState({ name: "", url: "", authToken: "", allowlist: "" });
  const nameError = form.name.includes("__") ? 'Names can\'t contain "__" (it separates server and tool).' : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nameError) return;
    const toolAllowlist = form.allowlist
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    register.mutate(
      {
        name: form.name.trim(),
        url: form.url.trim(),
        authToken: form.authToken || undefined,
        toolAllowlist: toolAllowlist.length ? toolAllowlist : undefined,
      },
      {
        onSuccess: () => {
          toast.success("MCP server registered");
          setForm({ name: "", url: "", authToken: "", allowlist: "" });
          onOpenChange(false);
        },
        onError: (err) => toast.error(errMessage(err, "Registration failed")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register an MCP server</DialogTitle>
          <DialogDescription>
            Point agents at a Model Context Protocol endpoint you run. The URL is SSRF-checked now and
            on every request; the token is encrypted at rest and never shown again.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              placeholder="catalog"
              maxLength={64}
              value={form.name}
              aria-invalid={!!nameError}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {nameError ? <p className="text-xs text-error">{nameError}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-url">Endpoint URL</Label>
            <Input
              id="mcp-url"
              type="url"
              placeholder="https://mcp.yourapp.com/mcp"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-token">Bearer token (optional)</Label>
            <Input
              id="mcp-token"
              type="password"
              autoComplete="off"
              value={form.authToken}
              onChange={(e) => setForm({ ...form, authToken: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-allow">Tool allowlist (comma-separated, optional)</Label>
            <Input
              id="mcp-allow"
              placeholder="get_course_outline, list_modules"
              value={form.allowlist}
              onChange={(e) => setForm({ ...form, allowlist: e.target.value })}
            />
            <p className="text-xs text-faint">
              Empty exposes every tool the server lists. A grant can only name an exposed tool.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={register.isPending || !form.name || !form.url}>
            {register.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            Register server
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RotateTokenDialog({
  server,
  onOpenChange,
}: {
  server: McpServer | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { projectId } = useProjectScope();
  const update = useUpdateMcpServer(projectId);
  const [token, setToken] = useState("");
  return (
    <Dialog open={!!server} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rotate token for “{server?.name}”</DialogTitle>
          <DialogDescription>The new token replaces the old one immediately. It can&apos;t be read back.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!server || !token) return;
            update.mutate(
              { serverId: server.id, authToken: token },
              {
                onSuccess: () => {
                  toast.success("Token rotated");
                  setToken("");
                  onOpenChange(false);
                },
                onError: (err) => toast.error(errMessage(err, "Rotation failed")),
              },
            );
          }}
        >
          <Input
            type="password"
            autoComplete="off"
            aria-label="New bearer token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={!token || update.isPending}>
            {update.isPending ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />}
            Replace token
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServersSection() {
  const { projectId } = useProjectScope();
  const { role } = useOrgCtx();
  const servers = useMcpServers(projectId);
  const update = useUpdateMcpServer(projectId);
  const remove = useDeleteMcpServer(projectId);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [rotating, setRotating] = useState<McpServer | null>(null);
  const isAdmin = role !== "developer";
  const rows = servers.data?.servers ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-medium text-foreground">MCP servers</h2>
          <p className="text-sm text-muted-foreground">Endpoints your agents may reach, scoped to this project.</p>
        </div>
        <RoleGate min="admin">
          <Button size="sm" onClick={() => setRegisterOpen(true)}>
            <PlusIcon />
            Register server
          </Button>
        </RoleGate>
      </div>

      {servers.isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : servers.isError ? (
        <QueryError message="Couldn't load MCP servers." onRetry={() => void servers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title="No servers registered"
          description="Register an MCP endpoint, then grant individual tools to individual agents."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <StatusBadge status={s.enabled ? "enabled" : "disabled"} />
                    {s.hasAuthToken ? (
                      <span className="inline-flex items-center gap-1 text-xs text-faint">
                        <LockKeyholeIcon className="size-3" /> token encrypted
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{s.url}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">id {s.id}</p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={s.enabled}
                      aria-label={s.enabled ? "Disable server" : "Enable server"}
                      onCheckedChange={(on) =>
                        update.mutate(
                          { serverId: s.id, enabled: on },
                          { onError: (err) => toast.error(errMessage(err, "Update failed")) },
                        )
                      }
                    />
                    <Button variant="outline" size="xs" onClick={() => setRotating(s)}>
                      <KeyRoundIcon />
                      Rotate token
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${s.name}`}
                      onClick={() => {
                        if (!window.confirm(`Delete "${s.name}"? Agents lose access to its tools immediately.`)) return;
                        remove.mutate(s.id, {
                          onSuccess: () => toast.success("Server deleted"),
                          onError: (err) => toast.error(errMessage(err, "Delete failed")),
                        });
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.toolAllowlist.length === 0 ? (
                  <span className="text-xs text-faint">All listed tools exposed</span>
                ) : (
                  s.toolAllowlist.map((t) => (
                    <span key={t} className="rounded-md bg-raised px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RegisterServerDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <RotateTokenDialog server={rotating} onOpenChange={(o) => !o && setRotating(null)} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tool grants
// ---------------------------------------------------------------------------

function IssueGrantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { projectId } = useProjectScope();
  const catalog = useCatalog(projectId);
  const servers = useMcpServers(projectId);
  const create = useCreateToolGrant(projectId);

  const agents = (catalog.data?.catalog ?? []).filter((e) => e.enabledForProject !== false);
  const serverRows = (servers.data?.servers ?? []).filter((s) => s.enabled);

  const [agentType, setAgentType] = useState<string>("");
  const [serverId, setServerId] = useState<string>("");
  const [toolName, setToolName] = useState("");
  const [sideEffectClass, setSideEffectClass] = useState<SideEffectClass>("READ_ONLY");
  const [schema, setSchema] = useState(SCHEMA_TEMPLATE);

  const selectedAgent = agents.find((a) => a.agentType === agentType);
  const selectedServer = serverRows.find((s) => s.id === serverId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let parametersJsonSchema: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(schema);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      parametersJsonSchema = parsed as Record<string, unknown>;
    } catch {
      toast.error("The parameters schema must be a JSON object");
      return;
    }
    create.mutate(
      { agentType, serverId, toolName: toolName.trim(), sideEffectClass, parametersJsonSchema },
      {
        onSuccess: () => {
          toast.success("Grant issued");
          setToolName("");
          onOpenChange(false);
        },
        onError: (err) => toast.error(errMessage(err, "Grant refused")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Grant a tool to an agent</DialogTitle>
          <DialogDescription>
            One grant = one agent × one server × one tool. You attest the tool&apos;s side-effect class
            and argument schema; the platform records who attested it.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Agent</Label>
              <Select value={agentType} onValueChange={(v) => setAgentType(String(v ?? ""))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.agentType} value={a.agentType}>
                      {a.agentType}
                      {a.toolsEnabled ? " · tool-ready" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Server</Label>
              <Select
                value={serverId}
                items={Object.fromEntries(serverRows.map((s) => [s.id, s.name]))}
                onValueChange={(v) => setServerId(String(v ?? ""))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a server" />
                </SelectTrigger>
                <SelectContent>
                  {serverRows.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAgent && !selectedAgent.toolsEnabled ? (
            <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
              {selectedAgent.agentType} isn&apos;t built for tool use yet, so this grant is recorded but
              never exposed to the model. Both halves — platform opt-in and your grant — must hold.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="grant-tool">Tool name</Label>
            <Input
              id="grant-tool"
              className="font-mono text-xs"
              placeholder={selectedServer?.toolAllowlist[0] ?? "get_course_outline"}
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
            />
            {selectedServer && selectedServer.toolAllowlist.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedServer.toolAllowlist.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setToolName(t)}
                    className={cn(
                      "rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors",
                      toolName === t ? "bg-brand-muted text-brand" : "bg-raised text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Side-effect class (your attestation)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SIDE_EFFECT_CLASSES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSideEffectClass(c)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    sideEffectClass === c ? "border-brand bg-brand-muted" : "border-border bg-surface hover:border-strong",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {sideEffectClass === c ? <CheckIcon className="size-3.5 text-brand" /> : null}
                    {CLASS_COPY[c].label}
                  </p>
                  <p className="text-xs text-muted-foreground">{CLASS_COPY[c].note}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grant-schema">Argument schema (JSON Schema, object-shaped)</Label>
            <Textarea
              id="grant-schema"
              rows={8}
              spellCheck={false}
              className="font-mono text-xs"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={create.isPending || !agentType || !serverId || !toolName.trim()}>
            {create.isPending ? <Loader2Icon className="animate-spin" /> : <ShieldCheckIcon />}
            Issue grant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GrantsSection() {
  const { projectId } = useProjectScope();
  const { role } = useOrgCtx();
  const grants = useToolGrants(projectId);
  const servers = useMcpServers(projectId);
  const revoke = useRevokeToolGrant(projectId);
  const [issueOpen, setIssueOpen] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const isAdmin = role !== "developer";

  const serverName = (id: string) => servers.data?.servers.find((s) => s.id === id)?.name ?? `…${id.slice(-6)}`;
  const rows = grants.data?.grants ?? [];
  const active = rows.filter((g) => !g.revokedAt);
  const revoked = rows.filter((g) => g.revokedAt);
  const inspected = rows.find((g) => g.id === inspect) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-medium text-foreground">Tool grants</h2>
          <p className="text-sm text-muted-foreground">
            Which agent may call which tool. Revoking keeps the row, so &ldquo;what allowed this, and
            when did it stop?&rdquo; stays answerable.
          </p>
        </div>
        <RoleGate min="admin">
          <Button size="sm" onClick={() => setIssueOpen(true)} disabled={(servers.data?.servers.length ?? 0) === 0}>
            <PlusIcon />
            Issue grant
          </Button>
        </RoleGate>
      </div>

      {grants.isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : grants.isError ? (
        <QueryError message="Couldn't load tool grants." onRetry={() => void grants.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheckIcon}
          title="No grants"
          description="Agents can't see any tool until a project admin grants it here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-raised text-left text-xs text-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Server · tool</th>
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Granted by</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {[...active, ...revoked].map((g) => (
                <tr key={g.id} className={cn(g.revokedAt && "opacity-60")}>
                  <td className="px-4 py-2.5 font-mono text-xs">{g.agentType}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {serverName(g.serverId)} · {g.toolName}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5",
                        g.sideEffectClass === "READ_ONLY" ? "bg-success-bg text-success" : "bg-raised text-muted-foreground",
                      )}
                    >
                      {CLASS_COPY[g.sideEffectClass as SideEffectClass]?.label ?? g.sideEffectClass}
                    </span>
                  </td>
                  <td className="max-w-40 truncate px-4 py-2.5 font-mono text-[11px] text-faint" title={g.grantedBy}>
                    {g.grantedBy}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={g.revokedAt ? "revoked" : "active"} />
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="xs" onClick={() => setInspect(g.id)}>
                      Schema
                    </Button>
                    {isAdmin && !g.revokedAt ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-error"
                        onClick={() => {
                          if (!window.confirm(`Revoke ${g.agentType} → ${g.toolName}?`)) return;
                          revoke.mutate(g.id, {
                            onSuccess: () => toast.success("Grant revoked"),
                            onError: (err) => toast.error(errMessage(err, "Revoke failed")),
                          });
                        }}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueGrantDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <Dialog open={!!inspected} onOpenChange={(o) => !o && setInspect(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attested argument schema</DialogTitle>
            <DialogDescription>
              {inspected ? `${inspected.agentType} → ${inspected.toolName}` : ""} — the shape the model is
              shown, as the granting admin attested it.
            </DialogDescription>
          </DialogHeader>
          <JsonPanel
            value={inspected?.parametersJsonSchema ?? null}
            label="parametersJsonSchema"
            empty="No schema on this legacy grant — it can never become a capability."
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function ToolsPage() {
  const { projectId } = useProjectScope();
  const catalog = useCatalog(projectId);
  const toolReady = (catalog.data?.catalog ?? []).filter((e) => e.toolsEnabled);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Tools"
        description="Let agents read from your systems over MCP — one explicitly granted tool at a time."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZapIcon className="size-4 text-brand" />
            Two keys turn a tool on
          </CardTitle>
          <CardDescription>A tool reaches the model only when both halves hold. Either one alone does nothing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-raised p-4">
            <BotIcon className="size-4 text-brand" />
            <p className="mt-2 text-sm font-medium text-foreground">Platform opt-in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The agent was built for a tool round — prompt, validation and callback all account for it.
              A reviewed code change, never a setting.
            </p>
            <p className="mt-2 text-xs text-foreground">
              Tool-ready today:{" "}
              {toolReady.length ? (
                toolReady.map((e) => (
                  <span key={e.agentType} className="font-mono">
                    {e.agentType}
                  </span>
                ))
              ) : (
                <span className="text-faint">none</span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-raised p-4">
            <ShieldCheckIcon className="size-4 text-brand" />
            <p className="mt-2 text-sm font-medium text-foreground">Your grant</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Per agent × server × tool, with your attested side-effect class and argument schema.
              Only <span className="font-medium text-foreground">read-only</span> tools execute.
            </p>
          </div>
          <div className="rounded-lg bg-raised p-4">
            <LockKeyholeIcon className="size-4 text-brand" />
            <p className="mt-2 text-sm font-medium text-foreground">Guardrails on every call</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Runs only inside durable jobs (never the playground), SSRF-checked on every redirect hop,
              credentials stripped cross-origin, results treated as untrusted input and truncated.
            </p>
          </div>
        </CardContent>
      </Card>

      <ServersSection />
      <GrantsSection />
    </div>
  );
}
