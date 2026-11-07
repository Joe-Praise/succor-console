"use client";

import { BookMarkedIcon, RocketIcon, WebhookIcon, LifeBuoyIcon } from "lucide-react";

import { CodeBlock } from "@/components/code-block";
import { AppLink, C, CardLink, DocLink, H2, H3, LI, Note, P, RequestCode, Step, Steps, Table, UL } from "@/features/docs/blocks";
import { useDocs } from "@/features/docs/context";
import { RequestJourney } from "@/features/docs/diagrams";
import { accepted202, buildBody, callbackUrlFor } from "@/features/docs/snippets";

export function OverviewPage() {
  return (
    <>
      <P>
        Succor runs AI agents for your product. You make one authenticated request. Succor turns it into a durable job, runs the agent, validates the
        output, and delivers the result to your own API. You never hold a connection open, and a crash on our side doesn&apos;t lose your work.
      </P>

      <div className="my-6 grid gap-3 sm:grid-cols-2">
        <CardLink to="quickstart" title="Quickstart" icon={RocketIcon}>
          From an API key to your first delivered result, in five steps.
        </CardLink>
        <CardLink to="callbacks" title="Receiving callbacks" icon={WebhookIcon}>
          Verify, dedupe and answer the requests we send you.
        </CardLink>
        <CardLink to="agents" title="Agent reference" icon={BookMarkedIcon}>
          Every agent&apos;s request and callback shape.
        </CardLink>
        <CardLink to="troubleshooting" title="Troubleshooting" icon={LifeBuoyIcon}>
          Something isn&apos;t working? Start from the symptom.
        </CardLink>
      </div>

      <H2>The path every request takes</H2>
      <P>Click a station, or let it play.</P>
      <RequestJourney />

      <H2>Two directions, two keys</H2>
      <P>Integration is one request out and one request in. Each direction has its own key, and they&apos;re not interchangeable.</P>
      <Table
        head={["Direction", "Key", "Who checks it"]}
        rows={[
          [
            "You call Succor",
            <>
              <C>SUCCOR_API_KEY</C> (<C>ask_live_…</C>)
            </>,
            "Succor checks it on every request",
          ],
          [
            "Succor calls you",
            <>
              <C>SUCCOR_CALLBACK_KEY</C> (<C>cbk_…</C>)
            </>,
            "You check it on every callback",
          ],
        ]}
      />

      <H2>What you get without building it</H2>
      <UL>
        <LI>
          <strong className="text-foreground">Durable execution.</strong> Jobs are saved before work starts. Leases, heartbeats and per-step checkpoints mean a
          crash resumes instead of restarting. See <DocLink to="jobs">Tracking a job</DocLink>.
        </LI>
        <LI>
          <strong className="text-foreground">Safe retries.</strong> A <C>requestId</C> stops a retried request from running twice. See{" "}
          <DocLink to="calling-agents">Calling an agent</DocLink>.
        </LI>
        <LI>
          <strong className="text-foreground">Retried delivery.</strong> Results are redelivered if your API is down, with a stable id to dedupe on. See{" "}
          <DocLink to="callbacks">Receiving callbacks</DocLink>.
        </LI>
        <LI>
          <strong className="text-foreground">Human review.</strong> High-risk output waits for a person. See <DocLink to="approvals">Human approvals</DocLink>.
        </LI>
        <LI>
          <strong className="text-foreground">A price on every run.</strong> Each run is metered once, with budgets and monthly invoices. See{" "}
          <DocLink to="usage-billing">Usage, budgets and invoices</DocLink>.
        </LI>
        <LI>
          <strong className="text-foreground">A signed record.</strong> Approvals and privileged actions land in an append-only ledger. See{" "}
          <DocLink to="security">Security and data</DocLink>.
        </LI>
      </UL>
    </>
  );
}

export function QuickstartPage() {
  const { agents, projectId, serviceUrl, scoped, status, callbackBaseUrl } = useDocs();
  const sample = agents[0];
  const body = sample ? buildBody(sample, projectId) : null;

  return (
    <>
      <P>
        {scoped ? (
          <>
            Every value below is already filled in for <C>{projectId}</C>.
          </>
        ) : (
          <>
            Snippets here use placeholders. <AppLink path="/docs">Open the docs from inside a project</AppLink> and they fill in with your real values.
          </>
        )}
      </P>

      {scoped && status && status !== "approved" ? (
        <Note kind="warning" title={`This project is ${status}`}>
          You can wire everything up now, but agent calls return 403 until the project is approved.
        </Note>
      ) : null}

      <Steps>
        <Step title="Set your environment">
          <P>
            Create an API key on <AppLink path="/keys">API keys</AppLink>. It&apos;s shown once, so put it straight in your secret store. The callback key was shown
            once when the project was created; if you&apos;ve lost it, rotate it on <AppLink path="/callbacks">Callbacks</AppLink>.
          </P>
          <CodeBlock
            label=".env"
            code={`SUCCOR_API_URL=${serviceUrl}\nSUCCOR_API_KEY=ask_live_…\nSUCCOR_CALLBACK_KEY=cbk_…`}
          />
          <Note kind="danger" title="Server side only">
            Never ship either key to a browser or a mobile app. Anyone holding the API key can spend your budget.
          </Note>
        </Step>

        <Step title="Tell us where to deliver">
          <P>
            Add a callback base URL on <AppLink path="/settings">Settings</AppLink>. Each agent calls a fixed path on it, so a base URL of{" "}
            <C>{callbackBaseUrl}</C> becomes <C>{callbackBaseUrl}{sample ? callbackUrlFor(sample) : "/your/path"}</C>.
          </P>
        </Step>

        <Step title="Trigger an agent">
          <P>
            Call it from your server. Always send a unique <C>requestId</C>: it&apos;s what makes a retry safe.
          </P>
          {sample && body ? <RequestCode entry={sample} body={body} /> : null}
          {sample ? <CodeBlock label="202 Accepted" code={JSON.stringify(accepted202(sample, projectId), null, 2)} lang="json" /> : null}
          <P>
            A <C>202</C>{" "}means the work is safely saved, not that it&apos;s finished. Store <C>jobId</C>. For anything else, see{" "}
            <DocLink to="responses">Responses and errors</DocLink>.
          </P>
        </Step>

        <Step title="Receive the result">
          <P>
            Build the endpoint for that agent&apos;s callback. Reject anything without your callback key, save the result, and answer 2xx.
          </P>
          {sample ? (
            <CodeBlock
              label={`${sample.callbackMethod} ${callbackBaseUrl}${callbackUrlFor(sample)}`}
              code={JSON.stringify(sample.callbackExample, null, 2)}
              lang="json"
            />
          ) : null}
          <P>
            <DocLink to="callbacks">Receiving callbacks</DocLink> has working handlers for Next.js, Express, FastAPI and Supabase.
          </P>
        </Step>

        <Step title="Watch it happen">
          <P>
            Your run appears on <AppLink path="/runs">Runs</AppLink> with a full timeline, and the traffic on <AppLink path="/requests">Requests</AppLink>. Not ready
            to build an endpoint? The <DocLink to="playground">Playground</DocLink> runs any enabled agent and shows you the callback it would have sent.
          </P>
        </Step>
      </Steps>

      <H2>Next</H2>
      <UL>
        <LI>
          Shape every output once, with a <DocLink to="profile">business profile</DocLink>.
        </LI>
        <LI>
          Chain agents into <DocLink to="workflows">workflows</DocLink>.
        </LI>
        <LI>
          Let agents read your data with <DocLink to="tools">tools</DocLink>.
        </LI>
      </UL>
    </>
  );
}

export function ConceptsPage() {
  return (
    <>
      <H2>Structure</H2>
      <Table
        head={["Term", "What it is"]}
        rows={[
          [<strong key="o" className="text-foreground">Organization</strong>, "Your company on Succor. Holds members, projects and the billing rollup. Starts pending until the platform approves it."],
          [<strong key="p" className="text-foreground">Project</strong>, "One application of yours. Owns its API keys, callback URLs, enabled agents, budget, profile and invoices. Also starts pending."],
          [
            <strong key="m" className="text-foreground">Member roles</strong>,
            <>
              <C>developer</C> can read everything and run things. <C>admin</C> also manages keys, settings, tools and approvals. <C>owner</C> also manages billing and the
              organization. Roles are checked fresh on every request.
            </>,
          ],
        ]}
      />

      <H2>Execution</H2>
      <Table
        head={["Term", "What it is"]}
        rows={[
          [<strong key="a" className="text-foreground">Agent</strong>, "One capability, like writing a quiz. Each has a fixed request schema and a fixed callback method and path. Agents are code: you can request a new one, but not define one."],
          [<strong key="j" className="text-foreground">Job (or run)</strong>, "One accepted request, saved durably. A worker leases it, runs the agent and checkpoints each step."],
          [<strong key="c" className="text-foreground">Checkpoint</strong>, "A saved step output. A retry replays finished steps instead of paying for them again."],
          [<strong key="e" className="text-foreground">Effect</strong>, "An intent to do something outside the run, such as a callback. Recorded during the run, released only after it succeeds."],
          [<strong key="d" className="text-foreground">Delivery</strong>, "The attempts to send one callback to your API."],
          [<strong key="w" className="text-foreground">Workflow</strong>, "A graph of agents. Every step is itself a durable job."],
        ]}
      />

      <H2>Three statuses, not one</H2>
      <P>
        One run has three separate lifecycles. Most confusion comes from treating them as one, so the console shows them side by side and so should your code.
      </P>
      <Table
        head={["Status", "Question it answers", "Values"]}
        rows={[
          [
            <strong key="1" className="text-foreground">Job</strong>,
            "Where is the work?",
            <>
              <C>queued</C> <C>running</C> <C>succeeded</C> <C>dead</C> <C>pending_approval</C> <C>rejected</C>
            </>,
          ],
          [
            <strong key="2" className="text-foreground">Outcome</strong>,
            "What did the agent return?",
            <>
              <C>success</C> <C>error</C> <C>validation_failed</C> <C>rate_limited</C> <C>skipped</C>
            </>,
          ],
          [
            <strong key="3" className="text-foreground">Delivery</strong>,
            "Did it reach your API?",
            <>
              <C>pending</C> <C>ready</C> <C>claimed</C> <C>succeeded</C> <C>failed</C> <C>dead</C> <C>cancelled</C>
            </>,
          ],
        ]}
      />
      <Note kind="tip" title="A succeeded job isn't a delivered result">
        A job can be <C>succeeded</C> while its delivery is <C>dead</C>: the agent did its work, but your API never accepted it. <DocLink to="reading-a-run">Reading a run</DocLink>{" "}
        walks through the combinations.
      </Note>

      <H2>Keys and credentials</H2>
      <H3>On your side</H3>
      <UL>
        <LI>
          <C>ask_live_…</C> is an API key. It calls Succor, belongs to one project and acts with <C>developer</C>{" "}rights there, so it can&apos;t mint keys or change settings.
        </LI>
        <LI>
          <C>cbk_…</C> is the callback key. Succor presents it when calling you.
        </LI>
      </UL>
      <P>
        More in <DocLink to="authentication">Authentication</DocLink>.
      </P>
    </>
  );
}
