"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon, FlaskConicalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";
import { useDocs } from "@/features/docs/context";
import { RequestCode } from "@/features/docs/blocks";
import { accepted202, buildBody, callbackUrlFor } from "@/features/docs/snippets";

/**
 * Build a real request for a real agent: pick one, edit the body, and the code, the 202 and
 * the callback you'd receive all follow. Nothing is sent; the playground is one click away.
 */
export function RequestBuilder() {
  const { agents, projectId, callbackBaseUrl, appHref } = useDocs();
  const [agentType, setAgentType] = useState<string | null>(null);
  const entry = agents.find((a) => a.agentType === agentType) ?? agents[0];
  const defaultText = entry ? JSON.stringify(buildBody(entry, projectId), null, 2) : "";
  const [edited, setEdited] = useState<{ for: string; text: string } | null>(null);
  if (!entry) return null;

  const text = edited?.for === entry.agentType ? edited.text : defaultText;
  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  try {
    const v: unknown = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) parsed = v as Record<string, unknown>;
    else parseError = "The body must be a JSON object.";
  } catch (err) {
    parseError = err instanceof Error ? err.message : "Invalid JSON";
  }
  const items = Object.fromEntries(agents.map((a) => [a.agentType, a.name]));
  const playground = appHref(`/playground?agent=${entry.agentType}`);

  return (
    <div className="tile my-5 overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-hairline px-3 py-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] text-faint">Agent</Label>
          <Select value={entry.agentType} items={items} onValueChange={(v) => setAgentType(v == null ? null : String(v))}>
            <SelectTrigger size="sm" className="min-w-52" aria-label="Agent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.agentType} value={a.agentType}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {playground ? (
          <Button size="sm" variant="outline" className="ml-auto" render={<Link href={playground} />}>
            <FlaskConicalIcon />
            Run it in the playground
            <ArrowRightIcon />
          </Button>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2">
        <div className="flex min-w-0 flex-col p-3 md:border-r md:border-hairline">
          <Label htmlFor="builder-body" className="text-[11px] text-faint">
            Request body (edit it)
          </Label>
          <textarea
            id="builder-body"
            spellCheck={false}
            value={text}
            onChange={(e) => setEdited({ for: entry.agentType, text: e.target.value })}
            aria-invalid={!!parseError}
            className={cn(
              "mt-1 min-h-64 w-full flex-1 resize-y rounded-lg border bg-canvas p-2.5 font-mono text-[12px] leading-[1.6] text-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              parseError ? "border-error/60" : "border-border",
            )}
          />
          {parseError ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-error">
              <CircleAlertIcon className="mt-0.5 size-3 shrink-0" />
              {parseError}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 space-y-3 border-t border-hairline p-3 md:border-t-0">
          <div>
            <p className="mb-1 text-[11px] text-faint">You get back straight away</p>
            <CodeBlock code={JSON.stringify(accepted202(entry, projectId, parsed ?? undefined), null, 2)} lang="json" label="202 Accepted" />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-faint">Then your API receives</p>
            <CodeBlock
              code={`${entry.callbackMethod} ${callbackBaseUrl}${callbackUrlFor(entry, parsed ?? undefined)}\n\n${JSON.stringify(entry.callbackExample, null, 2)}`}
              lang="json"
              label="callback"
            />
          </div>
        </div>
      </div>

      {parsed ? (
        <div className="border-t border-hairline px-3 pb-1">
          <RequestCode entry={entry} body={parsed} />
        </div>
      ) : null}
    </div>
  );
}
