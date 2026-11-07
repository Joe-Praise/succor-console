import type { ExecutionRecord, UsageBucket } from "@/types";

/**
 * SAMPLE DATA for the marketing site's product previews — never imported by the
 * console. Every preview that renders this is framed and labelled "Illustrative".
 * Shapes match the real API so the previews are drawn by the console's own code.
 */

const T0 = Date.parse("2026-10-14T09:12:00.000Z");
const at = (ms: number) => new Date(T0 + ms);

export const SAMPLE_RUN: ExecutionRecord = {
  job: {
    id: "6710f3c2a9e4b81d5c03f7aa",
    agentType: "campaign-writer",
    status: "succeeded",
    runStatus: "success",
    attempt: 1,
    maxAttempts: 1,
    requestId: "campaign-42-story",
    workflowId: null,
    initiatedBy: "apikey:northwind-app",
    lastError: null,
    createdAt: at(0),
    updatedAt: at(19_100),
    nextRunAt: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    result: { title: "Founders in focus", story: "…", results: "…" },
    input: { campaignId: 42, brand: "Northwind", tone: "editorial" },
  },
  checkpoints: [
    { name: "rag-references", completedAt: at(1_840), usage: null },
    {
      name: "llm-completion",
      completedAt: at(16_920),
      usage: { inputTokens: 3_214, outputTokens: 1_186 },
    },
    { name: "dedup", completedAt: at(17_600), usage: null },
    { name: "index-upsert", completedAt: at(18_950), usage: null },
  ],
  effects: [
    {
      id: "6710f3d8a9e4b81d5c03f7b1",
      effectKey: "callback:main",
      kind: "http.callback",
      status: "succeeded",
      attempt: 2,
      outcomeUnknown: false,
      error: null,
      deliveryId: "6710f3c2a9e4b81d5c03f7aa:callback:main",
      nextAttemptAt: null,
      createdAt: at(19_000),
      readyAt: at(25_400),
      claimedAt: at(25_450),
      succeededAt: at(25_760),
      failedAt: null,
      cancelledAt: null,
      deadAt: null,
      target: { method: "PUT", path: "/api/v1/campaigns/42/story" },
    },
  ],
  usage: [
    {
      id: "6710f3d8a9e4b81d5c03f7b4",
      ts: at(19_120),
      jobId: "6710f3c2a9e4b81d5c03f7aa",
      agentType: "campaign-writer",
      model: "gpt-4o",
      status: "success",
      inputTokens: 3_214,
      outputTokens: 1_186,
      embeddingTokens: 1_536,
      toolCalls: null,
      estimatedCostUsd: 0.0219,
      billedUsd: 0.0657,
      markupMultiplier: 3,
      pricingVersion: "2026-04",
      durationMs: 19_050,
      initiatedBy: "apikey:northwind-app",
      errorMessage: null,
    },
  ],
  audit: [],
};

/** Fourteen days of usage across five agents — a deterministic, plausible shape. */
export const SAMPLE_USAGE: UsageBucket[] = (() => {
  const agents: Array<[string, number, number]> = [
    // agentType, base runs/day, billed per run
    ["campaign-writer", 18, 0.066],
    ["seo-page-factory", 9, 0.094],
    ["quiz-generator", 31, 0.012],
    ["visual-tagger", 44, 0.006],
    ["insights-writer", 5, 0.081],
  ];
  const out: UsageBucket[] = [];
  for (let d = 0; d < 14; d++) {
    const period = new Date(Date.UTC(2026, 9, 1 + d)).toISOString();
    const weekday = new Date(period).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.45 : 1;
    agents.forEach(([agentType, base, perRun], i) => {
      const runs = Math.max(1, Math.round(base * weekend * (1 + 0.25 * Math.sin(d * 0.9 + i))));
      const failed = (d + i) % 6 === 0 ? 1 : 0;
      const billedUsd = Number((runs * perRun).toFixed(4));
      out.push({
        period,
        agentType,
        runs,
        inputTokens: runs * 1_900,
        outputTokens: runs * 640,
        embeddingTokens: runs * 300,
        costUsd: Number((billedUsd / 3).toFixed(4)),
        billedUsd,
        statuses: failed ? { success: runs - failed, error: failed } : { success: runs },
      });
    });
  }
  return out;
})();

export const SAMPLE_APPROVAL = {
  agentType: "seo-page-factory",
  agentName: "SEO Page Factory",
  jobId: "6711a04be2c79f0a8d14c2e9",
  target: { method: "PUT", path: "/api/v1/seo-pages/218" },
  input: {
    location: "lagos",
    serviceType: "founder-portraits",
    keywords: ["founder photography lagos", "executive headshots"],
    callbackPath: "/api/v1/seo-pages/218",
  },
  proposed: {
    h1: "Founder portrait photography in Lagos",
    meta_title: "Founder Portraits in Lagos | Executive Photography",
    meta_description:
      "Editorial founder and executive portraits in Lagos — planned around your brand story, delivered in 72 hours.",
    body_content:
      "<section>\n  <h2>Portraits that carry the company</h2>\n  <p>Your founder photo is often the first…</p>\n</section>",
  },
};
