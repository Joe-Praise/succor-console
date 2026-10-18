/**
 * Public description of what the agent-service platform does TODAY, written from
 * the backend's actual behaviour (agent-service @ agentic-ai). The long-form source
 * is `agent-service/docs/CAPABILITIES.md` — keep the two in step, and never claim
 * something here that the backend doesn't enforce.
 */

export interface Pillar {
  id: string;
  kicker: string;
  title: string;
  body: string;
  points: string[];
}

export const PILLARS: Pillar[] = [
  {
    id: "durable",
    kicker: "Durable execution",
    title: "Every call is a job that survives a crash.",
    body: "A POST returns 202 with a job id in milliseconds. A worker leases the job, checkpoints each model step, and heartbeats while it runs. If the process dies, the lease lapses and another worker resumes from the last checkpoint.",
    points: [
      "30-second leases, 10-second heartbeats, fenced terminal writes",
      "Per-step checkpoints — a retry replays finished steps instead of paying twice",
      "Poll any job: queued → running → succeeded, or dead-lettered with the reason",
    ],
  },
  {
    id: "approvals",
    kicker: "Human in the loop",
    title: "High-risk output waits for a person.",
    body: "Agents are risk-tiered. A gated agent generates and validates, then parks its delivery. An admin reviews it in the console — edits it, approves it, or rejects it with a note.",
    points: [
      "Approve is once-only and crash-safe — the worker delivers, never the click",
      "Reviewer edits are merged into the held delivery before it fires",
      "A rejection note becomes a durable style rule the next run follows",
    ],
  },
  {
    id: "workflows",
    kicker: "Workflows",
    title: "Multi-agent pipelines that resume where they stopped.",
    body: "Pipelines are code-defined graphs — single steps, parallel fan-outs, and quality gates with a critic and one retry. Every step is a durable job, so a crash resumes without repeating a step or spending twice.",
    points: [
      "Deterministic request ids per step — a resumed advancer reuses, never respawns",
      "Fan-out joins only when every branch settles (including human approvals)",
      "Gates park for a human after one retry, instead of burning tokens",
    ],
  },
  {
    id: "tools",
    kicker: "Tools over MCP",
    title: "Agents can read your systems — one granted tool at a time.",
    body: "Register your Model Context Protocol servers, then grant a specific tool to a specific agent with an attested argument schema. A tool reaches the model only when the agent was built for tools and you granted it.",
    points: [
      "Read-only tools execute; writes are recorded but not runnable yet",
      "SSRF-checked on every redirect hop, credentials stripped cross-origin",
      "Server tokens AES-256-GCM encrypted at rest and never shown again",
    ],
  },
  {
    id: "grounding",
    kicker: "Grounding & memory",
    title: "Agents know what you've already published.",
    body: "Writer agents retrieve your existing content as labelled reference material, reject near-duplicates before you pay for them, and follow the style rules your reviewers have taught them.",
    points: [
      "Every vector query is filtered to your project — your content is only compared with your own",
      "Retrieved text is fenced as data, never as instructions",
      "Lessons from rejections and conversion analysis carry across runs",
    ],
  },
  {
    id: "profile",
    kicker: "Business profile",
    title: "Describe your business once. Every prompt reads it.",
    body: "Prompts are platform code; your business is structured data. Type, industry, voice, audience, vocabulary and banned topics are injected as a fenced data block — length-capped and screened for injection.",
    points: [
      "Three layers: platform template → your profile → the request's context",
      "Instruction-shaped text and secrets are refused on save",
      "An empty profile changes nothing — prompts stay byte-identical",
    ],
  },
  {
    id: "delivery",
    kicker: "Reliable delivery",
    title: "Results reach your API, or you know exactly why not.",
    body: "Callbacks are recorded as durable effects and released only after a successful, fenced run. 5xx, 429 and timeouts retry with backoff; other 4xx stop. Every attempt is logged with its status and duration.",
    points: [
      "Signed with your callback key; stable X-Delivery-Id for deduplication",
      "Environment-aware targets — production, staging, local — SSRF-guarded",
      "Failed deliveries surface on your overview, not in a log you forgot",
    ],
  },
  {
    id: "governance",
    kicker: "Governance",
    title: "A signed record of every decision.",
    body: "Approvals, rejections, retention erasures and operator repairs land in an append-only ledger. Each row carries an HMAC at write time; sealed checkpoints make a deleted row detectable.",
    points: [
      "Actors are derived from credentials, never from what a caller claims",
      "Reviewer prose is never stored in the ledger — only its length",
      "Scheduled integrity sweeps verify recent activity",
    ],
  },
  {
    id: "protection",
    kicker: "Data protection",
    title: "Sensitive agents get encryption and a hard export boundary.",
    body: "Agents classified as protected have their payloads, checkpoints, results and held deliveries encrypted at rest. Their content is refused at the export seams — no vectors, no shared memory — and erased by retention once terminal.",
    points: [
      "AES-256-GCM on a dedicated key with rotation support",
      "Diagnostics are sanitized so provider text never leaks into errors",
      "Retention erases payloads but keeps the operational record",
    ],
  },
  {
    id: "cost",
    kicker: "Cost control",
    title: "Budgets that stop spend, prices you can audit.",
    body: "Each run is priced from metered tokens at a versioned rate card, snapshotted with its markup. A per-project monthly cap returns 402 before any work is queued, and idempotency keys make retries free.",
    points: [
      "Raw cost and billed price side by side on every run and invoice line",
      "Monthly invoices per project, itemized by agent",
      "Budget guard runs before enqueue — a 402 never burns your requestId",
    ],
  },
];

export interface Guarantee {
  claim: string;
  how: string;
  limit: string;
}

/** Stated precisely, including where each guarantee stops. */
export const GUARANTEES: Guarantee[] = [
  {
    claim: "A run is billed at most once",
    how: "Metering happens at one fenced terminal write per job; a stolen lease can't write it.",
    limit: "Covers model + embedding tokens. Tool and infra cost aren't metered yet.",
  },
  {
    claim: "A retried request never runs twice",
    how: "requestId is inserted before enqueue under a unique index; a replay returns duplicate: true.",
    limit: "Keys live 30 days. Use a fresh requestId after a 500.",
  },
  {
    claim: "An approved delivery is never lost",
    how: "Approval flips the job back to the durable queue in one guarded write; the worker delivers under its lease.",
    limit: "Delivery is at-least-once — make callback handlers idempotent.",
  },
  {
    claim: "A tenant can't reach another tenant",
    how: "Credentials resolve to one project; every read is scoped by membership checked against the database, not the token.",
    limit: "Isolation is enforced in the application, on a shared database.",
  },
  {
    claim: "A callback can't be pointed at our network",
    how: "Every target is DNS-resolved and checked against private, loopback and metadata ranges at save time and on every hop.",
    limit: "DNS rebinding between check and fetch is a documented residual risk.",
  },
];

export const ROADMAP: Array<{ title: string; body: string }> = [
  {
    title: "More tool-ready agents",
    body: "The tool runtime is wired into its first agent and heading through a staging-first activation. Each next agent is a reviewed opt-in, then a grant away.",
  },
  {
    title: "Critic-gated workflows",
    body: "The gate machinery is built and tested; a purpose-built page critic turns it on for SEO batches.",
  },
  {
    title: "Provider choice",
    body: "Agents already speak a provider-neutral contract. Additional model providers plug in below it without touching an agent.",
  },
  {
    title: "Push status & streaming",
    body: "Job status today is callback + poll. Server-sent progress is the natural next channel.",
  },
];
