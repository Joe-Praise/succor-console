import type { Metadata } from "next";

import { findPage } from "@/features/docs/nav";
import { PublicDocs } from "@/features/docs/public-docs";

type Props = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = findPage((slug ?? []).join("/"));
  return page ? { title: page.slug ? page.title : "Documentation", description: page.description } : { title: "Not found" };
}

export default async function PublicDocsPage({ params }: Props) {
  const { slug } = await params;
  return <PublicDocs slug={(slug ?? []).join("/")} />;
}
