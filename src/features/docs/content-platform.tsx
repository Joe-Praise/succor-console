"use client";

import { CodeBlock } from "@/components/code-block";
import { StationLine } from "@/components/ops/station-line";
import { AppLink, C, DocLink, H2, H3, LI, Note, P, Table, UL } from "@/features/docs/blocks";

export function ApprovalsPage() {
  return (
    <>
      <P>
        A high-risk agent generates and validates its output like any other, then stops. The delivery is held until a person decides. Nothing reaches your API before that, and every decision is recorded.
      </P>
      <div className="tile my-5 px-3 py-2">
        <StationLine
          stations={[
            { key: "a", label: "Generate", state: "done", detail: "Runs and validates" },
            { key: "b", label: "Hold", state: "waiting", detail: "pending_approval" },
            { key: "c", label: "Decide", state: "pending", detail: "An admin reviews" },
            { key: "d", label: "Deliver or learn", state: "pending", detail: "Approve or reject" },
          ]}
        />
      </div>

      <H2>Which agents</H2>
      <P>
        Agents are tiered by the blast radius of what they write. Those marked <C>riskTier: high</C>{" "}in the catalog are gated, and you can&apos;t turn the gate off. Today that&apos;s <C>seo-page-factory</C>. The <DocLink to="agents">Agent reference</DocLink> marks them.
      </P>

      <H2>Reviewing</H2>
      <P>
        Open <AppLink path="/approvals">Approvals</AppLink>. Each item shows what the agent was asked next to exactly what will be delivered. Developers can read the queue; deciding needs <C>admin</C>.
      </P>
      <Table
        head={["Decision", "What happens"]}
        rows={[
          [
            <strong key="a" className="text-foreground">Approve</strong>,
            "The job returns to the durable queue and a worker delivers it, with normal retries. Approval itself makes no network call, so a slow API on your side can't fail the click.",
          ],
          [
            <strong key="e" className="text-foreground">Approve with edits</strong>,
            <>
              The same, with your changes merged into the delivery first. You can edit <C>h1</C>, <C>meta_title</C>, <C>meta_description</C>, <C>body_content</C>, <C>faqs</C> and <C>generation_note</C>.
            </>,
          ],
          [
            <strong key="r" className="text-foreground">Reject</strong>,
            <>
              The delivery is discarded and the job ends <C>rejected</C>. If you wrote a note, it becomes a <DocLink to="grounding">style rule</DocLink> that future runs follow.
            </>,
          ],
        ]}
      />
      <Note kind="tip" title="Write rejection notes as instructions">
        &quot;Never use the word delve&quot; teaches the next run. &quot;Bad&quot; doesn&apos;t. Notes are limited to 2,000 characters.
      </Note>
      <P>
        Each approval works once. If two people decide at the same moment, the second gets <C>409</C> and the first decision stands.
      </P>

      <H2>With workflows</H2>
      <P>
        A workflow step that spawns gated jobs waits in the same queue, and joins once every one of them is approved or rejected.
      </P>
    </>
  );
}

export function WorkflowsPage() {
  return (
    <>
      <P>
        A workflow is a graph of agents. Every step is a durable job, and one process holds a lease on the workflow, so a crash resumes where it stopped without repeating a step or spending twice.
      </P>

      <H2>Step kinds</H2>
      <Table
        head={["Kind", "Behaviour"]}
        rows={[
          [<C key="1">single</C>, "One job."],
          [<C key="2">fanout</C>, "Many jobs in parallel, joined when every one settles, including any waiting for approval."],
          [<C key="3">gate</C>, "A generator and a critic. Fail once and it retries once. Fail again and it parks for a human instead of burning tokens."],
        ]}
      />
      <P>
        Workflows are defined in code, not in the console. Today&apos;s is <C>seo-batch</C>: <C>topic-cluster-builder</C>, then <C>seo-page-factory</C> for each page, then <C>link-weaver</C>. The quality gate is built, but no production critic agent exists yet, so <C>seo-batch</C> runs without one.
      </P>

      <H2>Starting one</H2>
      <P>
        Start from <AppLink path="/workflows">Workflows</AppLink>, or from your server. Starting needs the <C>admin</C>{" "}role, so a console session rather than an API key. The body is the workflow&apos;s input, with no wrapper.
      </P>
      <CodeBlock
        lang="http"
        label="start"
        code={`POST /portal/projects/:projectId/workflows/seo-batch

{ "pageIds": [101, 102, 103], … }

→ 202 { "workflowId": "…", "status": "running", "workflowType": "seo-batch" }`}
      />

      <H2>Why it can&apos;t double-spend</H2>
      <P>
        Each step&apos;s jobs get a request id computed from the workflow, step, attempt and index. A resumed process finds the job that already exists rather than creating a second one.
      </P>

      <Note kind="warning" title="Per-call guards don't apply to steps">
        Workflow jobs are enqueued directly rather than through the agent endpoints, so the budget cap and per-agent enablement aren&apos;t checked on each step. A long workflow can spend past a cap. Requiring <C>admin</C> to start one is what limits this today.
      </Note>
    </>
  );
}

export function ToolsPage() {
  return (
    <>
      <P>
        Tools let an agent read from your systems during a run, over the Model Context Protocol, instead of you stuffing everything into the request.
      </P>

      <H2>Two keys have to turn</H2>
      <P>A tool reaches the model only when both of these are true.</P>
      <Table
        head={["Key", "Who holds it", "What it means"]}
        rows={[
          [<strong key="1" className="text-foreground">The agent is tool-ready</strong>, "The platform", "The agent's prompt and validation were built for a tool step. Decided in code, per agent. You can't change it."],
          [<strong key="2" className="text-foreground">You granted the tool</strong>, "You", "One specific tool, on one server, for one agent."],
        ]}
      />
      <P>
        Tool-ready agents are marked in the <DocLink to="agents">Agent reference</DocLink>. Today that&apos;s <C>quiz-generator</C>.
      </P>

      <H2>Setting it up</H2>
      <ol className="my-3 list-inside list-decimal space-y-1 text-[14px] text-foreground/80 marker:font-mono marker:text-xs marker:text-brand">
        <li>
          On <AppLink path="/tools">Tools</AppLink>, register your MCP server: a name, its URL, and an auth token if it needs one. You can restrict it to an allowlist of tools.
        </li>
        <li>Grant a tool to an agent, attesting its side-effect class and a JSON Schema for its arguments.</li>
      </ol>
      <P>Both need <C>admin</C>. A revoked grant stays on record, so you can see afterwards what was allowed and when.</P>

      <H2>Only read-only tools run</H2>
      <Table
        head={["Side-effect class", "Executes?"]}
        rows={[
          [<C key="1">READ_ONLY</C>, "Yes"],
          [<C key="2">IDEMPOTENT_WRITE</C>, "Not yet: recorded, not run"],
          [<C key="3">NON_IDEMPOTENT_WRITE</C>, "Not yet: recorded, not run"],
          [<C key="4">UNKNOWN</C>, "Refused"],
        ]}
      />

      <H2>Safety</H2>
      <UL>
        <LI>Tokens are encrypted at rest with AES-256-GCM and never returned. The console only ever shows whether one is set.</LI>
        <LI>Server URLs go through the same checks as callback URLs, when saved and on each run, including every redirect hop.</LI>
        <LI>Credentials are stripped if a redirect leaves the original origin.</LI>
        <LI>Tool results are truncated and treated as untrusted data, not instructions.</LI>
        <LI>Tools run only in durable jobs. The playground can&apos;t reach your MCP servers.</LI>
      </UL>
    </>
  );
}

export function ProfilePage() {
  return (
    <>
      <P>
        A profile describes your business once, instead of in every request. Every agent in the project reads it, so output sounds like you without changes to your code. Set it on <AppLink path="/profile">Profile</AppLink>.
      </P>

      <H2>Fields</H2>
      <Table
        head={["Field", "Limit", "Example"]}
        rows={[
          [<C key="1">businessType</C>, "80 characters", "E-learning platform"],
          [<C key="2">industry</C>, "80 characters", "Education"],
          [<C key="3">brandVoice.tone</C>, "One of six", <>professional, friendly, bold, warm, technical, playful</>],
          [<C key="4">brandVoice.notes</C>, "300 characters", "Plain English. Encouraging, never condescending."],
          [<C key="5">audience</C>, "200 characters", "Working adults learning to code"],
          [<C key="6">terminology</C>, "10 items, 40 characters each", "cohort, module"],
          [<C key="7">bannedTopics</C>, "10 items, 60 characters each", "guaranteed job"],
        ]}
      />

      <H2>How it&apos;s used</H2>
      <P>Prompts have three layers that are never mixed: the platform&apos;s instructions, your profile, and the job&apos;s request. The profile goes in as clearly fenced data, not as instructions.</P>
      <UL>
        <LI>Text is screened for instruction-override phrases, secrets and delimiter escapes. Text that fails is rejected when you save.</LI>
        <LI>With no profile, prompts behave exactly as they would without one.</LI>
        <LI>Saving replaces the whole profile, so send every field.</LI>
      </UL>
      <P>
        Developers can read it. Changing it needs <C>admin</C>.
      </P>
    </>
  );
}

export function GroundingPage() {
  return (
    <>
      <P>Three writer agents (<C>seo-page-factory</C>, <C>campaign-writer</C>, <C>insights-writer</C>) learn from what you already have, instead of starting cold each time.</P>

      <H2>What they do</H2>
      <Table
        head={["Mechanism", "What it does"]}
        rows={[
          [<strong key="1" className="text-foreground">Dedup</strong>, "Rejects a near-duplicate of something you've already published, before you pay for a full generation."],
          [<strong key="2" className="text-foreground">Retrieval</strong>, "Pulls your most similar existing content into the prompt, as labelled reference material."],
          [<strong key="3" className="text-foreground">Indexing</strong>, "Adds each new result to your project's search corpus, so the next run can find it."],
          [<strong key="4" className="text-foreground">Style rules</strong>, <>Short lessons that the writers follow. They come from <DocLink to="approvals">rejection notes</DocLink> and from <C>conversion-learner</C>.</>],
        ]}
      />
      <P>Your corpus is isolated by project: every query filters on your project, and ids are prefixed with it.</P>

      <H2>Backfilling</H2>
      <P>
        Dedup and retrieval only know about content that&apos;s been indexed. To add what you already have, call <C>POST /agents/reindex-content</C> with up to 50 items at a time. It runs synchronously and is metered as embedding tokens.
      </P>
      <CodeBlock
        lang="json"
        label="POST /agents/reindex-content"
        code={`{
  "projectId": "my-project",
  "items": [
    {
      "namespace": "seo-pages",
      "id": 42,
      "text": "The page's full text…",
      "metadata": { "slug": "headshots-lagos" }
    }
  ]
}`}
      />
      <P>
        <C>namespace</C> is one of <C>seo-pages</C>, <C>campaign-stories</C> or <C>insights</C>. <C>text</C> is limited to 10,000 characters. The response is <C>{`{ upserted, failed }`}</C>, where <C>failed</C> lists the ids to retry.
      </P>

      <H3>Limits</H3>
      <P>Style rules can&apos;t be viewed or edited in the console yet.</P>
    </>
  );
}

export function PlaygroundPage() {
  return (
    <>
      <P>
        The <AppLink path="/playground">Playground</AppLink>{" "}runs any enabled agent from the browser, without touching your API. It&apos;s the fastest way to see what an agent produces and what its callback looks like.
      </P>
      <Table
        head={["", "Playground", "A real call"]}
        rows={[
          ["Runs the real agent", "Yes", "Yes"],
          ["Budget and enablement checks", "Yes", "Yes"],
          [<strong key="b" className="text-foreground">Metered and billed</strong>, <strong key="b2" className="text-foreground">Yes</strong>, "Yes"],
          ["Sends the callback", "No: captured and shown to you", "Yes"],
          ["Can reach your MCP tools", "No", "Yes"],
          ["Appears on Runs", "No: kept in the playground's history", "Yes"],
        ]}
      />
      <Note kind="warning" title="It costs real money">
        A playground run makes real model calls, and they count against your budget.
      </Note>
    </>
  );
}
