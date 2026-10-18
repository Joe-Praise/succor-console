/**
 * Behavioural traits of each agent that the catalog API doesn't carry (it ships
 * riskTier / dataClass / toolsEnabled; these are derived from the agents' source in
 * agent-service `src/agents/*`). Display-only — re-derive when an agent changes:
 *
 *   dedup        rejects near-duplicates of content you already have (vector similarity)
 *   grounded     retrieves your existing content as labelled reference material (RAG)
 *   learns       reads this project's style rules (from rejected approvals + analysis)
 *   teaches      writes style rules other agents read
 *   indexes      adds what it writes to your project's vector corpus
 *   structured   schema-constrained output (the model can't return the wrong shape)
 *   vision       looks at images
 *   web          fetches pages / APIs (SSRF-guarded on every hop)
 */
export type AgentTrait =
  | "dedup"
  | "grounded"
  | "learns"
  | "teaches"
  | "indexes"
  | "structured"
  | "vision"
  | "web";

export const TRAIT_META: Record<AgentTrait, { label: string; hint: string }> = {
  dedup: { label: "Dedup", hint: "Skips near-duplicates of content you already have." },
  grounded: { label: "Grounded", hint: "Reads your existing content as reference before writing." },
  learns: { label: "Learns", hint: "Follows this project's style rules from past rejections." },
  teaches: { label: "Teaches", hint: "Writes style rules other agents follow." },
  indexes: { label: "Indexes", hint: "Adds its output to your project's search corpus." },
  structured: { label: "Schema-locked", hint: "Output is constrained to an exact JSON schema." },
  vision: { label: "Vision", hint: "Understands images." },
  web: { label: "Web", hint: "Fetches external pages or APIs through the SSRF guard." },
};

export const AGENT_TRAITS: Record<string, AgentTrait[]> = {
  "seo-page-factory": ["structured", "dedup", "grounded", "learns", "indexes"],
  "campaign-writer": ["dedup", "grounded", "learns", "indexes"],
  "insights-writer": ["dedup", "grounded", "learns", "indexes"],
  "conversion-learner": ["teaches"],
  "alt-text-optimizer": ["vision"],
  "visual-tagger": ["vision"],
  "serp-comparator": ["web"],
  "youtube-course-discovery": ["web"],
};
