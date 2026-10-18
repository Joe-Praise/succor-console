/**
 * Client-side reference for the workflow definitions registered in agent-service
 * (`src/workflows/*`). Workflow SHAPES live in backend code — the server is the
 * authority and 404s an unknown type — so this is documentation + a starter input,
 * never the definition itself. Keep it in step with `src/workflows/index.ts`.
 */

export interface WorkflowTemplate {
  workflowType: string;
  name: string;
  summary: string;
  /** Human-readable outline of the DAG. */
  steps: Array<{ name: string; agentType: string; kind: "single" | "fanout" | "gate"; note: string }>;
  /** Things the caller must have in place before starting. */
  prerequisites: string[];
  /** A schema-valid starter input to edit. */
  exampleInput: Record<string, unknown>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    workflowType: "seo-batch",
    name: "SEO batch",
    summary:
      "Expand a topic cluster into N suggestions, generate one landing page per suggestion in parallel, then interlink the batch from an article.",
    steps: [
      {
        name: "topic-clusters",
        agentType: "topic-cluster-builder",
        kind: "single",
        note: "Suggests non-duplicative topics with outlines + target keywords.",
      },
      {
        name: "seo-pages",
        agentType: "seo-page-factory",
        kind: "fanout",
        note: "One page per suggestion (capped by pageIds). Each page parks in Approvals — the step joins once every page is approved or rejected.",
      },
      {
        name: "link-weaver",
        agentType: "link-weaver",
        kind: "single",
        note: "Injects internal links into the article across the new batch.",
      },
    ],
    prerequisites: [
      "topic-cluster-builder, seo-page-factory and link-weaver enabled on this project",
      "SEO page rows pre-created in your app — their ids go in pageIds",
      "An admin available to review the generated pages in Approvals",
    ],
    exampleInput: {
      environment: "production",
      clusterId: 7,
      cluster: {
        clusterLabel: "Founder branding",
        clusterKeywords: ["founder branding", "executive portraits"],
        insightCount: 4,
        campaignCount: 6,
        existingInsightTitles: ["Why founders need a visual identity"],
        campaignExamples: [{ title: "TechBrand launch", brand: "TechBrand", serviceType: "founder branding" }],
        keywordOpportunities: [{ keyword: "founder branding lagos", searchVolume: 320 }],
        businessName: "Your Business",
        siteTagline: "Brand growth for modern businesses",
      },
      pageIds: [101, 102, 103],
      seoContextBase: {
        location: "Lagos",
        businessName: "Your Business",
        siteTagline: "Brand growth for modern businesses",
        existingPortfolioItems: [],
        existingTestimonials: [],
        existingCampaigns: [],
      },
      linkWeaver: {
        insightId: 55,
        articleTitle: "A founder's guide to brand photography",
        body: "<p>…</p>",
        defaultLocationSlug: "lagos",
        campaigns: [{ id: 1, name: "TechBrand launch", slug: "techbrand-launch" }],
        brands: [{ id: 3, name: "TechBrand", slug: "techbrand" }],
        serviceTypes: [{ id: 2, name: "Founder branding", slug: "founder-branding" }],
      },
    },
  },
];

export const WORKFLOW_BY_TYPE = new Map(WORKFLOW_TEMPLATES.map((t) => [t.workflowType, t]));
