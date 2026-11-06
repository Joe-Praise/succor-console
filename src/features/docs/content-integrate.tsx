"use client";

import { useState } from "react";

import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";
import { AppLink, C, DocLink, H2, H3, LI, Note, P, PollCode, Table, UL } from "@/features/docs/blocks";
import { useDocs } from "@/features/docs/context";
import { DeliverySimulator, GuardChain, JobStateMachine } from "@/features/docs/diagrams";
import { RequestBuilder } from "@/features/docs/request-builder";
import { handlerSnippet, HANDLER_STACKS, type HandlerStack } from "@/features/docs/snippets";

export function AuthenticationPage() {
  return (
    <>
      <H2>Calling Succor: API keys</H2>
      <P>Send your key as a bearer token, from your server, on every request.</P>
      <CodeBlock code={`Authorization: Bearer ask_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} lang="http" />
      <UL>
        <LI>
          Create and revoke keys on <AppLink path="/keys">API keys</AppLink>. That needs the <C>admin</C> role.
        </LI>
        <LI>A key is shown once. We store only a hash and its last four characters, so a lost key can&apos;t be recovered: create another.</LI>
        <LI>
          A key belongs to one project. The <C>projectId</C> in your request body must match it, or you get <C>403</C>.
        </LI>
        <LI>
          A key acts with <C>developer</C>{" "}rights on its own project. It can run agents and read runs, usage and logs, but it can&apos;t mint keys, rotate secrets or change settings.
        </LI>
        <LI>A revoked key can take up to a minute to stop working everywhere.</LI>
      </UL>
      <Note title="If auth is briefly down">
        Key checks fail closed. If we can&apos;t verify a key because of a database problem you get <C>401</C> or <C>503</C>, never a free pass. Treat <C>503</C> as retryable.
      </Note>

      <H2>Trusting Succor: the callback key</H2>
      <P>
        When Succor calls your API it sends your callback key. Compare it to your copy and reject anything that doesn&apos;t match: your callback endpoint is public, and this is the
        only thing proving a request came from us.
      </P>
      <CodeBlock code={`X-Succor-Callback-Key: cbk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} lang="http" />
      <UL>
        <LI>It&apos;s shown once, when the project is created.</LI>
        <LI>
          Rotate it on <AppLink path="/callbacks">Callbacks</AppLink>. <strong className="text-foreground">The old key stops working immediately</strong>, so update your server at the same moment.
        </LI>
        <LI>
          The same value is also sent as <C>X-Agent-API-Key</C> for older integrations. New code should read <C>X-Succor-Callback-Key</C>.
        </LI>
      </UL>
      <Note kind="warning" title="Rotating causes a short failure window">
        A callback sent between the rotation and your deploy is answered 401 by your server, which is final and isn&apos;t retried. Rotate when traffic is quiet, and check{" "}
        <AppLink path="/callbacks">Callbacks</AppLink> afterwards for anything that failed.
      </Note>

      <H2>Who a run is attributed to</H2>
      <P>
        Every run records <C>initiatedBy</C>, and it&apos;s derived from your credential rather than trusted from the request body. Any value you send is ignored on an API key: the run is recorded as{" "}
        <C>apikey:…</C>. Console users are recorded as <C>portal:…</C>. The <C>202</C> response and the job both echo what was stored.
      </P>
    </>
  );
}

export function CallingAgentsPage() {
  const { agents, scoped } = useDocs();
  return (
    <>
      <P>
        Every agent has one endpoint, <C>POST /agents/&lt;agent-type&gt;</C>. Bodies differ per agent, but these fields behave the same everywhere.
      </P>

      <H2>Common fields</H2>
      <Table
        head={["Field", "Required", "What it does"]}
        rows={[
          [<C key="1">projectId</C>, "Yes", "The project to run in. Must match your API key's project."],
          [
            <C key="2">requestId</C>,
            "Strongly advised",
            <>
              Your idempotency key. Replaying one within the project starts nothing and returns <C>{`{ accepted: false, duplicate: true }`}</C>. Without it, a retried request runs and bills twice.
            </>,
          ],
          [
            <C key="3">environment</C>,
            "No",
            <>
              Which callback base URL to deliver to, by label. Defaults to <C>production</C>. See <DocLink to="environments">Environments and URLs</DocLink>.
            </>,
          ],
          [<C key="4">initiatedBy</C>, "No", "Ignored on an API key, because the server derives it from your credential. You can leave it out."],
          [
            <C key="5">&lt;id field&gt;</C>,
            "Per agent",
            <>
              Most agents take your record&apos;s id, like <C>courseId</C> or <C>seoPageId</C>. It&apos;s echoed in the <C>202</C> and used to build the callback URL.
            </>,
          ],
          [
            <C key="6">context</C>,
            "Per agent",
            <>
              What the agent needs to do the job. See the <DocLink to="agents">Agent reference</DocLink>.
            </>,
          ],
        ]}
      />
      <P>The request body limit is 512 KB.</P>

      <H2>Build a request</H2>
      <P>
        {scoped ? "Pick one of your enabled agents and edit the body." : "This uses a real agent contract. Inside a project it lists your enabled agents."} The code, the response and the callback follow what you type. Nothing is sent from here.
      </P>
      {agents.length ? <RequestBuilder /> : <Note>No agents are enabled for this project yet, so there&apos;s nothing to build a request for.</Note>}

      <H2>Idempotency</H2>
      <P>Use something that identifies the action, not the attempt, so a retry reuses it naturally.</P>
      <CodeBlock
        lang="js"
        label="good and bad requestIds"
        code={`// Good: the same action always produces the same id
requestId: \`quiz:\${courseId}:\${moduleIndex}:v\${contentVersion}\`

// Good: generate once, store it with your record, reuse it on retry
requestId: order.agentRequestId

// Bad: a new id on every attempt defeats the point
requestId: crypto.randomUUID()   // ...if generated inside your retry loop`}
      />
      <H3>When to reuse it and when not to</H3>
      <Table
        head={["You got", "Same requestId again?", "Why"]}
        rows={[
          [<C key="1">202</C>, "Yes, safely", "The retry answers as a duplicate. Nothing runs twice."],
          [<C key="2">402</C>, "Yes", "The budget check runs before the id is recorded, so it's still unused."],
          [<C key="3">403</C>, "Yes", "The enablement check also runs before the id is recorded."],
          [<C key="4">400</C>, <strong key="4b" className="text-warning">No, use a new one</strong>, "The id was recorded before the schema check, so resending it answers as a duplicate and nothing runs."],
          [<C key="5">500</C>, <strong key="5b" className="text-warning">No, use a new one</strong>, "The id was recorded, but enqueueing failed, so no job exists for it."],
          ["Network error", "Yes", "You don't know whether it landed. A duplicate answer means it did."],
        ]}
      />
      <Note kind="warning" title="A duplicate answer has no job id">
        <C>{`{ accepted: false, duplicate: true }`}</C>{" "}doesn&apos;t tell you the original <C>jobId</C>. Save the id from the first <C>202</C>, or find the run by its <C>requestId</C> on <AppLink path="/runs">Runs</AppLink>.
      </Note>
    </>
  );
}

export function ResponsesPage() {
  return (
    <>
      <P>
        Checks run in a fixed order and the first failure answers. Nothing is enqueued or billed until they all pass. Click one to see its response.
      </P>
      <GuardChain />

      <H2>All responses</H2>
      <Table
        head={["Status", "Means", "Retry?"]}
        rows={[
          [<C key="1">202</C>, "Accepted. The body has jobId.", "Not needed"],
          [<C key="2">200</C>, <>Duplicate: this <C>requestId</C> was already used. Nothing new ran.</>, "Not needed"],
          [<C key="3">400</C>, <>Body failed the agent&apos;s schema. <C>issues</C> names the fields.</>, <>After fixing, with a <strong className="text-foreground">new</strong> requestId</>],
          [<C key="4">401</C>, "Missing, malformed or revoked key.", "After fixing the key"],
          [<C key="5">402</C>, "The project's monthly budget is reached.", "After the cap is raised or the month rolls"],
          [<C key="6">403</C>, "Key doesn't match the project, project isn't active, or the agent isn't enabled.", "After fixing it"],
          [<C key="7">500</C>, "Couldn't enqueue. Rare: it means the database just became unavailable.", <>Yes, with a <strong className="text-foreground">new</strong> requestId</>],
          [<C key="8">503</C>, "Authentication temporarily unavailable.", "Yes, with backoff"],
        ]}
      />

      <H2>Error bodies</H2>
      <P>
        Errors always carry a human-readable <C>error</C>. Some add detail: <C>issues</C> on a <C>400</C>, and the budget figures on a <C>402</C>. Branch on the status code, not the message text, since messages may change.
      </P>
      <CodeBlock
        lang="js"
        label="handling a response"
        code={`if (res.status === 202) {
  const { jobId } = await res.json();
  await saveJobId(jobId);
} else if (res.status === 200) {
  // Duplicate: this requestId already ran. Use the jobId you saved the first time.
} else if (res.status === 402) {
  await pauseAgentFeature(); // same requestId is safe to use later
} else if (res.status >= 500) {
  await retryLater({ newRequestId: res.status === 500 });
} else {
  // 400, 401, 403: your side needs fixing. Don't retry blindly.
  logger.error(await res.json());
}`}
      />
    </>
  );
}

export function CallbacksPage() {
  const { agents } = useDocs();
  const [stack, setStack] = useState<HandlerStack>("nextjs");
  const sample = agents[0];
  return (
    <>
      <P>
        When a run succeeds, Succor sends the result to your API. Each agent uses a fixed method and path on your base URL, so you build one route per agent you use.
      </P>

      <H2>What arrives</H2>
      <Table
        head={["Header", "Value"]}
        rows={[
          [<C key="1">X-Succor-Callback-Key</C>, "Your callback key. Verify it on every request."],
          [<C key="2">X-Delivery-Id</C>, <>Stable across retries of one delivery, in the form <C>&lt;jobId&gt;:&lt;effectKey&gt;</C>. Dedupe on it.</>],
          [<C key="3">X-Agent-API-Key</C>, "The same key, for older integrations."],
          [<C key="4">Content-Type</C>, <C key="4b">application/json</C>],
        ]}
      />
      <P>
        The body is the agent&apos;s result. See each agent&apos;s shape in the <DocLink to="agents">Agent reference</DocLink>.
      </P>

      <H2>What your response does</H2>
      <P>Only the status code matters: the body you return is ignored. Pick a response to see what happens next.</P>
      <DeliverySimulator />
      <Table
        head={["You answer", "What happens"]}
        rows={[
          ["2xx", "Delivered. Finished."],
          ["5xx or 429", "Retried: up to 3 attempts in total, waiting 5s then 10s."],
          ["No answer in 30s, or a network error", <>Retried the same way. The outcome is recorded as unknown, since your server may have processed it.</>],
          ["Any other 4xx", "Final. Not retried."],
          ["3xx", "Final. Redirects are never followed."],
        ]}
      />

      <H2>Build it to be safe</H2>
      <H3>Delivery is at least once</H3>
      <P>
        A timeout doesn&apos;t mean your server didn&apos;t process the request. A crash on our side can also resend one. So the same delivery can arrive more than once, and your handler has to cope. Either upsert by the id in the URL, so a repeat changes nothing, or record each <C>X-Delivery-Id</C>{" "}and skip ones you&apos;ve seen.
      </P>
      <H3>Answer quickly</H3>
      <P>
        You have 30 seconds. If saving the result is slow, queue it and answer <C>200</C>{" "}straight away, so that slow work can&apos;t turn into a retry and a duplicate.
      </P>
      <H3>Only answer 4xx if you mean it</H3>
      <P>
        A 4xx is treated as permanent, so the result is not resent. If your database is briefly down, answer <C>503</C>, not <C>400</C>, and the delivery is retried.
      </P>

      <H2>Handlers</H2>
      {sample ? (
        <>
          <P>
            Written for <C>{sample.agentType}</C>, using its real method and path.
          </P>
          <CodeBlock
            className="my-4"
            lang={stack === "fastapi" ? "python" : "js"}
            code={handlerSnippet(stack, sample)}
            label={HANDLER_STACKS.find((s) => s.id === stack)?.filename}
            actions={
              <div role="tablist" aria-label="Framework" className="flex items-center gap-0.5">
                {HANDLER_STACKS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={stack === s.id}
                    onClick={() => setStack(s.id)}
                    className={cn(
                      "h-5 rounded-[3px] px-1.5 text-[11px] font-medium transition-colors",
                      stack === s.id ? "bg-raised text-foreground" : "text-faint hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
          />
        </>
      ) : null}

      <H2>Seeing what happened</H2>
      <P>
        Every attempt is recorded for 30 days with its URL, status, duration and error, on <AppLink path="/callbacks">Callbacks</AppLink>. If a callback is missing,{" "}
        <DocLink to="jobs">poll the job</DocLink>: the result is on it whether or not delivery worked.
      </P>
      <Note title="A held run doesn't call you yet">
        For an agent behind <DocLink to="approvals">human approval</DocLink>, the callback fires only after someone approves it.
      </Note>
    </>
  );
}

export function JobsPage() {
  return (
    <>
      <P>Callbacks are the normal path. Polling is how you reconcile when one goes missing, or how you show progress in your own UI.</P>

      <H2>Job states</H2>
      <P>Click a state.</P>
      <JobStateMachine />

      <H2>Reading a job</H2>
      <PollCode />
      <CodeBlock
        lang="json"
        label="200 OK"
        code={JSON.stringify(
          {
            job: {
              _id: "6710f3c2a9d4e81b2c0f4a17",
              projectId: "my-project",
              agentType: "quiz-generator",
              status: "succeeded",
              runStatus: "success",
              attempt: 1,
              maxAttempts: 1,
              lastError: null,
              initiatedBy: "apikey:<key id>",
              result: { questions: ["…"] },
              createdAt: "2026-11-06T10:00:00.000Z",
              updatedAt: "2026-11-06T10:00:21.000Z",
            },
          },
          null,
          2,
        )}
      />
      <Table
        head={["Field", "Meaning"]}
        rows={[
          [<C key="1">status</C>, "Where the job is. See the diagram above."],
          [<C key="2">runStatus</C>, <>What the agent returned: <C>success</C>, <C>error</C>, <C>validation_failed</C>, <C>rate_limited</C> or <C>skipped</C>. Empty until it has one.</>],
          [<C key="3">attempt / maxAttempts</C>, "Worker claims used, out of this agent's budget. Set per agent. Most agents get one; seo-page-factory gets three."],
          [<C key="4">lastError</C>, "A sanitized reason, when something went wrong."],
          [<C key="5">result</C>, "The agent's output. Null if it was erased by retention."],
        ]}
      />
      <Note title="It says nothing about delivery">
        This endpoint reports the job, not the callback. For delivery state use <C>GET /portal/projects/:projectId/jobs/:jobId</C>, listed in the <DocLink to="api">API reference</DocLink>.
      </Note>
      <P>
        A job in another project answers <C>404</C>, not <C>403</C>, so that job ids don&apos;t leak.
      </P>

      <H2>What makes a job durable</H2>
      <Table
        head={["Mechanism", "What it gives you"]}
        rows={[
          ["Saved before work starts", "The 202 means the job exists. A crash after that can't lose it."],
          ["Lease and heartbeat", "A worker holds a 30-second lease, renewed every 10 seconds. If it dies, the lease lapses and another worker takes over."],
          ["Checkpoints", "Each model step's output is saved. A retry replays finished steps instead of paying for them twice."],
          ["Backoff", "Retries wait 5s, doubling each time, up to 5 minutes."],
          ["Billed once", "Only the worker holding the current lease can finish a job, so a stolen lease can't bill twice."],
        ]}
      />

      <H2>A reconciliation job</H2>
      <P>Worth having if a missed result would matter. Sweep for records still waiting, and check their jobs.</P>
      <CodeBlock
        lang="js"
        label="reconcile.js"
        code={`for (const record of await findStuckRecords({ olderThanMinutes: 30 })) {
  const res = await fetch(\`\${process.env.SUCCOR_API_URL}/agents/jobs/\${record.jobId}\`, {
    headers: { Authorization: \`Bearer \${process.env.SUCCOR_API_KEY}\` },
  });
  const { job } = await res.json();

  if (job.status === "succeeded" && job.result) await applyResult(record, job.result);
  if (job.status === "dead" || job.status === "rejected") await markFailed(record, job.lastError);
  // queued, running, pending_approval: still in progress, leave it.
}`}
      />
    </>
  );
}

export function EnvironmentsPage() {
  return (
    <>
      <P>
        A project has one or more callback base URLs, each with a label. Set them on <AppLink path="/settings">Settings</AppLink>. Your request&apos;s <C>environment</C> field picks one.
      </P>

      <H2>How a URL is chosen</H2>
      <ol className="my-3 list-inside list-decimal space-y-1 text-[14px] text-foreground/80 marker:font-mono marker:text-xs marker:text-brand">
        <li>
          The entry whose label equals your <C>environment</C>.
        </li>
        <li>
          If there&apos;s none, the entry labelled <C>production</C>.
        </li>
        <li>If there&apos;s none, the first entry.</li>
      </ol>
      <Note kind="warning" title="It falls back, it doesn't fail">
        A typo like <C>environment: &quot;stagng&quot;</C>{" "}doesn&apos;t raise an error. It delivers to <C>production</C>. <C>environment</C> also defaults to <C>production</C>{" "}when you leave it out, so set it explicitly from anything that isn&apos;t production.
      </Note>
      <CodeBlock
        lang="json"
        label="example"
        code={`{
  "projectId": "my-project",
  "requestId": "quiz:course_123:1",
  "environment": "local",
  "courseId": "course_123"
}`}
      />

      <H2>Which URLs are allowed</H2>
      <P>Base URLs are checked when you save them and again before every delivery, because DNS can change in between.</P>
      <Table
        head={["Target", "Allowed?"]}
        rows={[
          ["Public https URL", "Yes"],
          ["Plain http", "Not in production"],
          [<>Loopback (<C key="l">localhost</C>, <C key="m">127.0.0.1</C>)</>, "Only outside production, for local development"],
          ["Private ranges (10.x, 192.168.x and similar)", "Only if the platform operator has allowlisted that host"],
          ["Link-local, including cloud metadata addresses", "Never"],
        ]}
      />
      <P>A hostname that resolves to any disallowed address is rejected. Redirects aren&apos;t followed.</P>

      <H2>Developing locally</H2>
      <P>
        Succor has to be able to reach your server. On a hosted environment that means a public URL, so use a tunnel (ngrok, Cloudflare Tunnel) and add it as a base URL labelled <C>local</C>. Or skip the endpoint for now: the <DocLink to="playground">Playground</DocLink> shows the callback without sending it.
      </P>
    </>
  );
}
