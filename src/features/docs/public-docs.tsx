"use client";

import { SAMPLE_AGENT, type DocsEnv } from "@/features/docs/context";
import { DocsShell } from "@/features/docs/shell";

/** Public docs: placeholders instead of project values, and one real contract as the sample. */
const PUBLIC_ENV: DocsEnv = {
  scoped: false,
  serviceUrl: "https://api.your-succor-host.example",
  projectId: "my-project",
  agents: [SAMPLE_AGENT],
  status: null,
  callbackBaseUrl: "https://your-api.example.com",
  docHref: (s) => (s ? `/docs/${s}` : "/docs"),
  appHref: () => null,
};

export function PublicDocs({ slug }: { slug: string }) {
  return <DocsShell env={PUBLIC_ENV} slug={slug} stickyClass="sticky top-12 self-start pt-8" />;
}
