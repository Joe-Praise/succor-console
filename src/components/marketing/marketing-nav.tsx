"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { label: "Agents", href: "/agents" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-sm font-semibold">
              {BRAND_NAME.charAt(0).toLowerCase()}
            </span>
          </span>
          <span className="font-mono text-sm tracking-wide text-foreground">
            {BRAND_NAME.toLowerCase()}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/register" />}>
            Start building
            <ArrowRightIcon />
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent side="right" className="w-64">
              <SheetTitle className="px-1 pt-2">{BRAND_NAME.toLowerCase()}</SheetTitle>
              <nav className="mt-4 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-raised hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-raised hover:text-foreground"
                >
                  Sign in
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
        <p>
          <span className="font-mono text-foreground">{BRAND_NAME.toLowerCase()}</span> — production
          agents, workflows, and automation, metered and billed.
        </p>
        <nav className="flex items-center gap-5">
          <Link href="/agents" className="hover:text-foreground">
            Agents
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
