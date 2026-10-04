/**
 * Single swap point for the product's public identity. `BRAND_NAME` is the
 * company/mark; `PRODUCT_NAME` is the app users log into. Every page, nav,
 * metadata title, and marketing section derives from these.
 *
 * Positioning note: keep copy category-agnostic. The platform runs AI agents
 * today, but is built to grow into workflows, integrations, and automation —
 * so avoid boxing the brand into "AI" in names and taglines.
 */
export const BRAND_NAME = "Succor";

/** The console users sign in to (window title, marketing product references). */
export const PRODUCT_NAME = "Succor Console";

/** Short tagline used in metadata + the marketing footer. */
export const BRAND_TAGLINE = "The control plane for agents, workflows, and automation.";

/** Public contact address shown on the marketing site. */
export const BRAND_CONTACT_EMAIL = "hello@succor.com";

/** Public site origin — canonical URLs, sitemap, OpenGraph. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://succor.com";
