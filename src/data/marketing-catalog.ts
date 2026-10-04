/**
 * Public marketing copy of the agent catalog. Mirrors agent-service
 * `src/lib/agent-catalog.ts` (names/categories/one-liners only — no request or
 * callback internals). Swap for a public GET /catalog endpoint later.
 */

export type MarketingCategory = "seo" | "content" | "analysis" | "elearning" | "vision";

export interface MarketingAgent {
  agentType: string;
  name: string;
  category: MarketingCategory;
  description: string;
  /** Pricing hint — typical chat max_tokens for a run. */
  typicalMaxTokens: number;
}

export const CATEGORY_META: Record<
  MarketingCategory,
  { label: string; blurb: string }
> = {
  seo: {
    label: "SEO",
    blurb: "Programmatic landing pages, internal-link strategy, SERP gap analysis, and image alt text.",
  },
  elearning: {
    label: "E-learning",
    blurb: "Turn source material into structured courses, quizzes, learning paths, and personalized nudges.",
  },
  analysis: {
    label: "Analysis",
    blurb: "Lead nurture, sentiment, personas, and conversion insight — from your own data.",
  },
  content: {
    label: "Content",
    blurb: "Campaign stories, insight articles, brand narratives — deduped against what you've already published.",
  },
  vision: {
    label: "Vision",
    blurb: "Image understanding at scale — taxonomy tagging and SEO-rich alt text.",
  },
};

export const MARKETING_CATALOG: MarketingAgent[] = [
  // ── SEO ───────────────────────────────────────────────────────────────────
  {
    agentType: "seo-page-factory",
    name: "SEO Page Factory",
    category: "seo",
    description:
      "Generates complete programmatic landing pages — H1, meta, body, FAQs — with semantic dedup against pages you already have.",
    typicalMaxTokens: 4096,
  },
  {
    agentType: "link-weaver",
    name: "Link Weaver",
    category: "seo",
    description:
      "Injects internal links into an article body without rewriting the prose, and reports back every entity it referenced.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "alt-text-optimizer",
    name: "Alt Text Optimizer",
    category: "seo",
    description:
      "Looks at each image in a gallery and writes SEO-rich alt text for it — then patches it back automatically.",
    typicalMaxTokens: 1024,
  },
  {
    agentType: "topic-cluster-builder",
    name: "Topic Cluster Builder",
    category: "seo",
    description:
      "Suggests new, non-duplicative article topics with outlines and target keywords to complete a content cluster.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "link-strategist",
    name: "Link Strategist",
    category: "seo",
    description:
      "Analyzes your internal link graph and orphan pages, then recommends entity-to-entity links with anchor text.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "serp-comparator",
    name: "SERP Comparator",
    category: "seo",
    description:
      "Fetches competitor pages (SSRF-guarded) and returns a content-gap analysis: missing entities, FAQs, and topics.",
    typicalMaxTokens: 2048,
  },
  // ── Content ───────────────────────────────────────────────────────────────
  {
    agentType: "campaign-writer",
    name: "Campaign Writer",
    category: "content",
    description:
      "Writes a long-form campaign story, results section, and meta tags — deduping against stories you've already told.",
    typicalMaxTokens: 4096,
  },
  {
    agentType: "insights-writer",
    name: "Insights Writer",
    category: "content",
    description:
      "Drafts long-form insight and blog articles with meta tags, skipping topics that are near-duplicates of existing work.",
    typicalMaxTokens: 4096,
  },
  {
    agentType: "brand-writer",
    name: "Brand Writer",
    category: "content",
    description:
      "Produces a brand overview that draws on the brand's real associated work — never generic boilerplate.",
    typicalMaxTokens: 2048,
  },
  // ── Analysis ──────────────────────────────────────────────────────────────
  {
    agentType: "audit-nurture",
    name: "Audit Nurture",
    category: "analysis",
    description:
      "Generates a two-step email nurture sequence for each lead, segmented by score and queued for delivery.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "content-quality-advisor",
    name: "Content Quality Advisor",
    category: "analysis",
    description:
      "Summarizes content-audit alerts into a prioritized, actionable remediation list your team can work through.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "conversion-learner",
    name: "Conversion Learner",
    category: "analysis",
    description:
      "Studies your audit, booking, and contact metrics, then recommends concrete copy changes that could lift conversion.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "persona-extractor",
    name: "Persona Extractor",
    category: "analysis",
    description:
      "Extracts structured persona tags — role, industry, use case, outcome — from unstructured stories, for analytics.",
    typicalMaxTokens: 1024,
  },
  {
    agentType: "review-sentiment-analyzer",
    name: "Review Sentiment Analyzer",
    category: "analysis",
    description:
      "Classifies review sentiment and flags entries for moderation, with a rating-based fallback when there's no text.",
    typicalMaxTokens: 512,
  },
  // ── E-learning ────────────────────────────────────────────────────────────
  {
    agentType: "youtube-course-discovery",
    name: "YouTube Course Discovery",
    category: "elearning",
    description:
      "Searches YouTube for the best playlists on a topic, groups videos into modules, and imports them as structured courses.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "course-summariser",
    name: "Course Summariser",
    category: "elearning",
    description:
      "Produces difficulty level, prerequisites, a what-you'll-build blurb, and summary bullets for any course.",
    typicalMaxTokens: 1024,
  },
  {
    agentType: "auto-tagger",
    name: "Auto Tagger",
    category: "elearning",
    description:
      "Assigns topical tags and a category to each course so search and filtering actually work.",
    typicalMaxTokens: 512,
  },
  {
    agentType: "course-recommender",
    name: "Course Recommender",
    category: "elearning",
    description:
      "Recommends the next courses for each learner — excluding what they've finished — with a reason for every pick.",
    typicalMaxTokens: 1024,
  },
  {
    agentType: "learning-path-builder",
    name: "Learning Path Builder",
    category: "elearning",
    description:
      "Sequences courses into an ordered path toward a stated goal, with per-step reasoning and estimated duration.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "quiz-generator",
    name: "Quiz Generator",
    category: "elearning",
    description:
      "Generates multiple-choice quizzes per module — four options, indexed answers, ready to render.",
    typicalMaxTokens: 2048,
  },
  {
    agentType: "progress-nudge",
    name: "Progress Nudge",
    category: "elearning",
    description:
      "Writes a short, personalized re-engagement message for each inactive learner. Not a template — a message.",
    typicalMaxTokens: 512,
  },
  // ── Vision ────────────────────────────────────────────────────────────────
  {
    agentType: "visual-tagger",
    name: "Visual Tagger",
    category: "vision",
    description:
      "Classifies every image into a controlled taxonomy — style, composition, setting, lighting, subjects, formality.",
    typicalMaxTokens: 1024,
  },
];

export const CATALOG_COUNTS: Record<MarketingCategory, number> = MARKETING_CATALOG.reduce(
  (acc, a) => {
    acc[a.category] += 1;
    return acc;
  },
  { seo: 0, content: 0, analysis: 0, elearning: 0, vision: 0 } as Record<MarketingCategory, number>,
);
