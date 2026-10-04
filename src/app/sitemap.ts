import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/brand";
import { MARKETING_CATALOG } from "@/data/marketing-catalog";

/** Public marketing routes + one indexable page per agent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/agents", "/contact"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const agents = MARKETING_CATALOG.map((a) => ({
    url: `${SITE_URL}/agents/${a.agentType}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...pages, ...agents];
}
