import type { Metadata } from "next";
import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { default: "Documentation", template: `%s · ${BRAND_NAME} docs` },
  description: "Guides and API reference for running durable agents on Succor.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1320px] items-center gap-2 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label={BRAND_NAME}>
            <BrandMark />
            <span className="text-[13px] font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
          </Link>
          <span className="text-faint" aria-hidden>
            /
          </span>
          <Link href="/docs" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" render={<Link href="/platform" />}>
              Platform
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Sign in
            </Button>
            <Button size="sm" render={<Link href="/register" />}>
              Start building
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
