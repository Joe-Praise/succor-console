"use client";

import Link from "next/link";

import { MARKETING_CATALOG } from "@/data/marketing-catalog";
import { CapabilityBadges } from "@/features/agents/capability-badges";
import { CodeBlock } from "@/components/code-block";
import { MethodMark } from "@/components/ops/primitives";
import { AppLink, C, DocLink, H2, H3, LI, Note, P, Table, UL } from "@/features/docs/blocks";
import { useDocs } from "@/features/docs/context";
import { buildBody } from "@/features/docs/snippets";
import { parseEndpoint } from "@/lib/catalog";

export function ReadingARunPage() {
  return (
    <>
      <P>
        Open any run from <AppLink path="/runs">Runs</AppLink>. The line at the top shows where it got to. Below it, the timeline lists everything recorded, and the tabs hold the input, output, cost, delivery and audit trail.
      </P>

      <H2>Common combinations</H2>
      <Table
        head={["Job", "Outcome", "Delivery", "What happened", "What to do"]}
        rows={[
          [<C key="1">succeeded</C>, <C key="2">success</C>, <C key="3">succeeded</C>, "All good.", "Nothing."],
          [<C key="1">succeeded</C>, <C key="2">success</C>, <C key="3">dead</C>, "The work is done, but your API never accepted it, even after retries.", "Fix your endpoint. The result is still on the job."],
          [<C key="1">succeeded</C>, <C key="2">success</C>, <C key="3">failed</C>, "Your API answered with a final error, like a 404 or 401.", "Check the delivery's status code."],
          [<C key="1">succeeded</C>, <C key="2">success</C>, <C key="3">ready</C>, "A delivery is queued or waiting to retry.", "Wait."],
          [<C key="1">succeeded</C>, <C key="2">validation_failed</C>, <C key="3">cancelled</C>, "The agent's output didn't pass validation, so nothing was sent.", "Check the input. Run it again."],
          [<C key="1">dead</C>, <C key="2">error</C>, <C key="3">cancelled</C>, "It used all its attempts. The reason is in lastError.", "Read the reason, then call again with a new requestId."],
          [<C key="1">pending_approval</C>, <C key="2">success</C>, <C key="3">pending</C>, "Finished, waiting for a human.", "Review it in Approvals."],
          [<C key="1">rejected</C>, <C key="2">success</C>, <C key="3">cancelled</C>, "A reviewer rejected it.", "Nothing, unless you want another run."],
        ]}
      />

      <H2>Reading the timeline</H2>
      <P>
        Every marker is a timestamp that was actually recorded. The gap between two markers is the time since the previous recorded event, <strong className="text-foreground">not how long a step took</strong>, because step start times aren&apos;t recorded.
      </P>
      <UL>
        <LI>A retried delivery shows the latest attempt&apos;s times: each retry overwrites the previous ones. The full list of attempts is on <AppLink path="/callbacks">Callbacks</AppLink>.</LI>
        <LI>
          <strong className="text-foreground">Elapsed</strong> runs from job creation to the last recorded state change. It includes queue wait and any time held for approval.
        </LI>
        <LI>
          <strong className="text-foreground">Duration</strong>{" "}on a usage record is the agent&apos;s execution time. It excludes both.
        </LI>
      </UL>

      <H2>Finding a run</H2>
      <P>
        Paste a job id into <kbd className="rounded-[3px] bg-raised px-1 font-mono text-[11px]">⌘K</kbd> to jump straight to it. <AppLink path="/runs">Runs</AppLink> also filters by status, agent, time, request id and workflow.
      </P>
    </>
  );
}

export function UsageBillingPage() {
  return (
    <>
      <H2>What&apos;s metered</H2>
      <Table
        head={["", "Billed?"]}
        rows={[
          ["Model input and output tokens", "Yes"],
          ["Embedding tokens", "Yes"],
          ["Tool calls, infrastructure, callback delivery", "No"],
          [<>A replayed <C key="1">requestId</C></>, "No: it starts nothing"],
          ["Retries inside a run", "No: a run is billed once, at its final state"],
          ["A failed run", "Yes, for the tokens it actually used"],
        ]}
      />

      <H2>How the price is set</H2>
      <CodeBlock code={`billed = provider cost × your markup`} lang="text" />
      <P>
        Provider cost comes from the tokens used and a versioned rate card. Each usage record snapshots its cost, markup and rate-card version when written, so later price changes never alter past records. See every record on <AppLink path="/logs">Logs</AppLink>, and totals on <AppLink path="/usage">Usage</AppLink>.
      </P>

      <H2>Budgets</H2>
      <P>
        A project can have a monthly cap, in UTC months. Once this month&apos;s billed total reaches it, agent calls return <C>402</C> until the cap is raised or the month rolls.
      </P>
      <Note kind="warning" title="The cap is soft">
        It stops new work, but it isn&apos;t a hard limit on spend:
        <UL>
          <LI>Spend is counted after a run bills, so a burst of simultaneous calls can each see room and overshoot slightly.</LI>
          <LI>Jobs already accepted still finish and bill.</LI>
          <LI>
            <DocLink to="workflows">Workflow</DocLink>{" "}steps aren&apos;t checked against it.
          </LI>
          <LI>If the budget check itself fails, the request proceeds rather than being blocked.</LI>
        </UL>
        Set it below the amount you actually can&apos;t exceed.
      </Note>

      <H2>Invoices</H2>
      <P>
        One invoice per project per UTC month, itemized by agent and built from the same records you see on Logs. Numbers look like <C>INV-my-project-202611</C>.
      </P>
      <Table
        head={["Status", "Means"]}
        rows={[
          [<C key="1">draft</C>, "Generated, not yet sent to you."],
          [<C key="2">issued</C>, "Due. Pay it, then submit your payment reference."],
          [<C key="3">payment_submitted</C>, "You've told us it's paid. Waiting for confirmation."],
          [<C key="4">paid</C>, "Confirmed."],
          [<C key="5">void</C>, "Cancelled."],
        ]}
      />
      <P>
        Admins can view invoices at <AppLink path="/invoices">Invoices</AppLink>. Submitting a payment needs the <C>owner</C> role.
      </P>
    </>
  );
}

export function SecurityPage() {
  return (
    <>
      <H2>Credentials</H2>
      <Table
        head={["Secret", "How it's stored"]}
        rows={[
          ["API keys", "SHA-256 hash and last four characters. Shown once."],
          ["Callback key", "Stored readable, because we have to present it to you. Shown once. Rotatable."],
          ["MCP server tokens", "AES-256-GCM encrypted. Never returned."],
          ["Passwords", "bcrypt."],
        ]}
      />

      <H2>Outbound requests</H2>
      <P>
        Anything we fetch from a URL you control (callbacks, MCP servers, web pages for agents that read them) is checked against <DocLink to="environments#which-urls-are-allowed">the same rules</DocLink>, every time, and redirects are not followed blindly.
      </P>

      <H2>Prompt injection</H2>
      <UL>
        <LI>Your profile, retrieved content and tool results go into prompts as labelled data, not instructions.</LI>
        <LI>Profile text is screened when saved. Agent output is checked against blocked patterns before it can be delivered.</LI>
        <LI>Structured agents can only return their schema.</LI>
      </UL>
      <P>These reduce the risk. They don&apos;t eliminate it. Treat agent output as untrusted when you render it: sanitize generated HTML before displaying it.</P>

      <H2>Data at rest</H2>
      <P>
        An agent can be classified <C>protected</C>, which encrypts its payloads, results and checkpoints with AES-256-GCM and refuses to copy its data into search or memory. The mechanism is live, but no agent in the current catalog is classified this way, so <strong className="text-foreground">today&apos;s agents store their payloads unencrypted at the application level</strong>. The <DocLink to="agents">Agent reference</DocLink> marks any that are protected.
      </P>

      <H2>The audit ledger</H2>
      <P>
        Approvals and privileged actions are written to an append-only ledger, and each row is signed with an HMAC. Periodic checkpoints seal closed time ranges, so a deleted row is detectable. Read it on <AppLink path="/audit">Audit</AppLink>.
      </P>
      <UL>
        <LI>A reviewer&apos;s note is never stored in the ledger, only its length.</LI>
        <LI>Verifying signatures is an operator task, so the console shows the data, not a verification result.</LI>
      </UL>

      <H2>Roles</H2>
      <Table
        head={["Can…", "Developer", "Admin", "Owner"]}
        rows={[
          ["Read runs, usage, logs, audit", "Yes", "Yes", "Yes"],
          ["Run agents, use the playground", "Yes", "Yes", "Yes"],
          ["Manage keys, settings, tools", "No", "Yes", "Yes"],
          ["Decide approvals, start workflows", "No", "Yes", "Yes"],
          ["View invoices", "No", "Yes", "Yes"],
          ["Submit payments, manage the org", "No", "No", "Yes"],
        ]}
      />
    </>
  );
}

export function TroubleshootingPage() {
  return (
    <>
      <H2>My request failed</H2>
      <Table
        head={["Symptom", "Likely cause", "Fix"]}
        rows={[
          [<C key="a">401</C>, "Key missing, mistyped or revoked.", <>Check the header is exactly <C>Authorization: Bearer ask_live_…</C>.</>],
          [<>403 <C key="b">API key is not authorized…</C></>, "The body's projectId isn't this key's project.", "Use the key created for that project."],
          [<>403 <C key="c">Project is not active</C></>, "The project is pending or suspended.", "Check its status. You can set everything up while it's pending."],
          [<>403 <C key="d">Agent not enabled…</C></>, "This agent isn't enabled for the project.", <>See <AppLink path="/agents">Agents</AppLink>.</>],
          [<>403 <C key="e">Agent temporarily disabled</C></>, "The platform paused this agent for everyone.", "Try again later. It's usually an incident response."],
          [<C key="f">402</C>, "Monthly budget reached.", <>Raise the cap, or wait for the month to roll. See <DocLink to="usage-billing#budgets">Budgets</DocLink>.</>],
          [<C key="g">400</C>, "The body failed the agent's schema.", <>Read <C>issues</C>, fix it, and use a <strong className="text-foreground">new</strong> requestId.</>],
          [<>200 <C key="h">duplicate: true</C> and nothing ran</>, "This requestId was already used, often by an earlier 400.", "Send a new requestId."],
        ]}
      />

      <H2>My callback didn&apos;t arrive</H2>
      <P>
        Start at <AppLink path="/requests">Requests</AppLink>, or open the run and check its delivery.
      </P>
      <Table
        head={["What you see", "Likely cause", "Fix"]}
        rows={[
          ["The job isn't succeeded yet", "Still working, or held for approval.", <>Check <AppLink path="/approvals">Approvals</AppLink>.</>],
          [<>Delivery shows <C key="a">401</C></>, "Your handler rejects our key. A rotated key not yet deployed is the usual reason.", "Compare SUCCOR_CALLBACK_KEY. Only the X-Succor-Callback-Key header carries it."],
          [<>Delivery shows <C key="b">404</C></>, "No route at that path, or the wrong base URL.", <>Match the agent&apos;s path, and check the <DocLink to="environments">environment</DocLink> label.</>],
          [<>Delivery shows <C key="c">3xx</C></>, "A redirect. HTTP to HTTPS, or a trailing slash, are the usual ones.", "Point the base URL at the final address."],
          ["No response, or timed out", "Your server is unreachable, or slower than 30s.", "Answer quickly and do slow work in the background."],
          ["It went to the wrong server", <><C key="d">environment</C> was missing or mistyped, so it fell back to production.</>, "Set it explicitly."],
          ["No delivery, no error", "The agent's output failed validation, or the agent skipped.", "Check the run's outcome."],
          ["Blocked URL error", "The URL is private, loopback in production, or plain http.", <>See <DocLink to="environments#which-urls-are-allowed">allowed URLs</DocLink>.</>],
        ]}
      />

      <H2>Something ran wrong</H2>
      <Table
        head={["Symptom", "Likely cause", "Fix"]}
        rows={[
          ["I received the same callback twice", "Normal: delivery is at least once.", <>Dedupe on <C>X-Delivery-Id</C>, or upsert by id.</>],
          ["The same work ran twice", <>No <C key="a">requestId</C>, or a new one on each retry.</>, <>See <DocLink to="calling-agents#idempotency">Idempotency</DocLink>.</>],
          [<>Job is <C key="b">dead</C> with a rate-limit error</>, "The model provider is out of quota or rate-limited.", "Wait, then call again with a new requestId."],
          ["Job stuck in queued", "Workers are busy or the service is restarting.", "Give it a minute. Contact support if it stays."],
          ["The output ignores our style", "No profile set, or nothing teaching it.", <>Set a <DocLink to="profile">profile</DocLink>, and write useful <DocLink to="approvals">rejection notes</DocLink>.</>],
        ]}
      />

      <H2>Still stuck</H2>
      <P>
        Open a ticket from <AppLink path="/support">Support</AppLink>{" "}with the job id. It&apos;s the fastest route to an answer.
      </P>
    </>
  );
}

/** Live contracts inside a project; names and descriptions publicly, since contracts need an account. */
export function AgentsReferencePage() {
  const { scoped, agents, projectId } = useDocs();

  if (!scoped) {
    return (
      <>
        <Note title="Full contracts are inside the console">
          Sign in and open the docs from a project to see each agent&apos;s request and callback, with your project&apos;s values filled in.{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </Note>
        <div className="my-5 grid gap-2 sm:grid-cols-2">
          {MARKETING_CATALOG.map((a) => (
            <Link key={a.agentType} href={`/agents/${a.agentType}`} className="tile tile-link block p-3">
              <p className="text-[13px] font-semibold text-foreground">{a.name}</p>
              <p className="font-mono text-[11px] text-faint">{a.agentType}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
            </Link>
          ))}
        </div>
      </>
    );
  }

  if (agents.length === 0) {
    return (
      <Note>
        No agents are enabled for this project. <AppLink path="/agents">Browse the catalog</AppLink>.
      </Note>
    );
  }

  return (
    <>
      <P>
        These are the agents enabled for <C>{projectId}</C>. Requests show the fields each agent takes; <DocLink to="calling-agents#common-fields">common fields</DocLink> behave the same everywhere.
      </P>
      {agents.map((a) => {
        const { method, path } = parseEndpoint(a.endpoint);
        return (
          <section key={a.agentType} className="mt-9 first-of-type:mt-5">
            <H3>{a.name}</H3>
            <p className="-mt-1 font-mono text-[11px] text-faint">{a.agentType}</p>
            <P className="my-2">{a.description}</P>
            <CapabilityBadges entry={a} />
            <div className="tile my-3 divide-y divide-hairline font-mono text-xs">
              <p className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-6 text-[10.5px] text-faint uppercase">in</span>
                <MethodMark method={method} />
                <span className="min-w-0 truncate text-foreground">{path}</span>
              </p>
              <p className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-6 text-[10.5px] text-faint uppercase">out</span>
                <MethodMark method={a.callbackMethod} />
                <span className="min-w-0 truncate text-foreground">
                  <span className="text-faint">{"<base URL>"}</span>
                  {a.callbackPath}
                </span>
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <CodeBlock label="Request body" lang="json" code={JSON.stringify(buildBody(a, projectId), null, 2)} />
              <CodeBlock label="Callback body" lang="json" code={JSON.stringify(a.callbackExample, null, 2)} />
            </div>
          </section>
        );
      })}
    </>
  );
}

const API_GROUPS: Array<{ title: string; note?: string; rows: Array<[string, string, string]> }> = [
  {
    title: "Agents",
    rows: [
      ["POST", "/agents/:agentType", "Run an agent. Answers 202."],
      ["POST", "/agents/reindex-content", "Add up to 50 items to your search corpus. Synchronous."],
      ["GET", "/agents/jobs/:jobId", "One job: status, outcome, attempts, result."],
    ],
  },
  {
    title: "Runs",
    rows: [
      ["GET", "/portal/projects/:projectId/jobs", "List runs. Filters: status, agentType, workflowId, requestId, initiatedBy, from, to, limit, cursor."],
      ["GET", "/portal/projects/:projectId/jobs/:jobId", "The full record: checkpoints, delivery effects, usage, audit."],
      ["GET", "/portal/projects/:projectId/jobs/:jobId/checkpoints/:name", "One checkpoint's saved output."],
      ["GET", "/portal/projects/:projectId/ops-summary", "Counts, rates and durations for a window."],
    ],
  },
  {
    title: "Usage",
    rows: [
      ["GET", "/projects/:projectId/usage", "Buckets by day, month or year, grouped by agent or model."],
      ["GET", "/projects/:projectId/usage/current", "This UTC month's totals and budget."],
      ["GET", "/portal/projects/:projectId/usage-records", "Every priced record. Filters and cursor."],
      ["GET", "/projects/:projectId/logs", "Recent activity log."],
    ],
  },
  {
    title: "Deliveries, approvals and audit",
    rows: [
      ["GET", "/portal/projects/:projectId/callbacks", "Delivery attempts. Filters: ok, agentType, limit."],
      ["GET", "/portal/projects/:projectId/approvals", "Runs waiting for a decision, with what would be delivered."],
      ["GET", "/portal/projects/:projectId/audit", "The signed ledger. Filters and cursor."],
    ],
  },
  {
    title: "Project",
    rows: [
      ["GET", "/portal/projects/:projectId/setup", "Service URL, environment and enabled agents."],
      ["GET", "/portal/catalog?projectId=", "The agent catalog, marked with what's enabled for you."],
      ["GET", "/portal/projects/:projectId/workflows", "Workflows and their steps."],
    ],
  },
];

export function ApiReferencePage() {
  const { serviceUrl } = useDocs();
  return (
    <>
      <P>
        The base URL is <C>{serviceUrl}</C>. Authenticate with <C>Authorization: Bearer ask_live_…</C> and send JSON. This is what an API key can reach; anything needing <C>admin</C> or <C>owner</C> is console-only.
      </P>
      {API_GROUPS.map((g) => (
        <section key={g.title}>
          <H2>{g.title}</H2>
          <div className="tile my-3 divide-y divide-hairline overflow-hidden">
            {g.rows.map(([method, path, what]) => (
              <div key={path} className="grid gap-x-4 gap-y-0.5 px-3 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <p className="flex min-w-0 items-baseline font-mono text-xs text-foreground">
                  <MethodMark method={method} />
                  <span className="min-w-0 break-all">{path}</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{what}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <H2>Pagination</H2>
      <P>
        Lists with a <C>cursor</C> parameter return <C>nextCursor</C>. Pass it back to get the next page; <C>null</C> means there are no more. <C>limit</C> tops out at 100. A cursor belongs to one project, and using it on another answers <C>400</C>.
      </P>

      <H2>Rate limits</H2>
      <P>There are no per-route rate limits today, though the budget cap limits spend. Don&apos;t rely on this staying true: handle <C>429</C> if you see one.</P>

      <H2>Timestamps and money</H2>
      <P>Timestamps are ISO 8601 in UTC. Amounts are US dollars as decimal numbers.</P>
    </>
  );
}

export { LI };
