/**
 * The docs' table of contents. Slugs are the URL under /docs (public) and
 * /o/:org/p/:project/docs (project-scoped, with that project's real values filled in).
 * `keywords` feed the search box, so a page can be found by the words people arrive with.
 */

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  keywords?: string;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    title: "Get started",
    pages: [
      { slug: "", title: "Overview", description: "What Succor does, and the path every request takes.", keywords: "intro introduction lifecycle how it works" },
      { slug: "quickstart", title: "Quickstart", description: "From an API key to your first delivered result.", keywords: "getting started first call setup install" },
      { slug: "concepts", title: "Core concepts", description: "Organizations, projects, agents, jobs, deliveries.", keywords: "glossary terminology vocabulary org project job run" },
    ],
  },
  {
    title: "Integrate",
    pages: [
      { slug: "authentication", title: "Authentication", description: "API keys for calling us, the callback key for trusting us.", keywords: "bearer token ask_live cbk rotate revoke 401 credentials" },
      { slug: "calling-agents", title: "Calling an agent", description: "The request, idempotency, and a request builder.", keywords: "post body requestId idempotency initiatedBy environment curl builder" },
      { slug: "responses", title: "Responses and errors", description: "Every status code, in the order the checks run.", keywords: "202 200 400 401 402 403 500 503 duplicate guard chain budget errors" },
      { slug: "callbacks", title: "Receiving callbacks", description: "Verifying, deduping and answering deliveries.", keywords: "webhook delivery retry backoff x-delivery-id x-succor-callback-key timeout 3xx redirect handler" },
      { slug: "jobs", title: "Tracking a job", description: "Job states, and polling when a callback goes missing.", keywords: "status poll queued running succeeded dead pending_approval rejected state machine reconcile" },
      { slug: "environments", title: "Environments and URLs", description: "Which base URL a delivery goes to, and what URLs are allowed.", keywords: "production staging local base url ssrf https allowlist" },
    ],
  },
  {
    title: "Platform",
    pages: [
      { slug: "approvals", title: "Human approvals", description: "Holding high-risk output for a person.", keywords: "gated review approve reject edit style rule risk tier" },
      { slug: "workflows", title: "Workflows", description: "Durable multi-agent pipelines.", keywords: "seo-batch fan-out gate pipeline orchestration" },
      { slug: "tools", title: "Tools and MCP", description: "Letting agents read your systems, one grant at a time.", keywords: "mcp server grant read only allowlist side effect" },
      { slug: "profile", title: "Business profile", description: "One description of your business, read by every prompt.", keywords: "brand voice tone audience terminology banned topics" },
      { slug: "grounding", title: "Grounding and memory", description: "Dedup, retrieval and style rules that compound.", keywords: "rag pinecone vector dedup memory lessons reindex" },
      { slug: "playground", title: "Playground", description: "Running an agent without touching your API.", keywords: "test try browser captured callback" },
    ],
  },
  {
    title: "Operate",
    pages: [
      { slug: "reading-a-run", title: "Reading a run", description: "Job status, outcome and delivery are three different things.", keywords: "timeline diagnose debug run detail outcome" },
      { slug: "usage-billing", title: "Usage, budgets and invoices", description: "What's metered, how the price is set, what a cap does.", keywords: "cost markup billed tokens budget cap 402 invoice payment" },
      { slug: "security", title: "Security and data", description: "Where secrets live and what's stored.", keywords: "encryption audit ledger ssrf protected data retention" },
      { slug: "troubleshooting", title: "Troubleshooting", description: "Symptom, cause, fix.", keywords: "error debug problem not working missing callback duplicate 401 403" },
    ],
  },
  {
    title: "Reference",
    pages: [
      { slug: "agents", title: "Agent reference", description: "Every agent's request and callback.", keywords: "catalog contract schema examples" },
      { slug: "api", title: "API reference", description: "Every endpoint an API key can call.", keywords: "endpoints routes rest http" },
    ],
  },
];

export const ALL_PAGES: DocPage[] = DOC_SECTIONS.flatMap((s) => s.pages);

export function findPage(slug: string): DocPage | null {
  return ALL_PAGES.find((p) => p.slug === slug) ?? null;
}

export function neighbours(slug: string): { prev: DocPage | null; next: DocPage | null } {
  const i = ALL_PAGES.findIndex((p) => p.slug === slug);
  return { prev: i > 0 ? ALL_PAGES[i - 1]! : null, next: i >= 0 && i < ALL_PAGES.length - 1 ? ALL_PAGES[i + 1]! : null };
}

/** Case-insensitive match on title, description and keywords; title hits rank first. */
export function searchPages(query: string): DocPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const hay = (p: DocPage) => `${p.title} ${p.description} ${p.keywords ?? ""}`.toLowerCase();
  return ALL_PAGES.filter((p) => terms.every((t) => hay(p).includes(t))).sort(
    (a, b) => Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q)),
  );
}
