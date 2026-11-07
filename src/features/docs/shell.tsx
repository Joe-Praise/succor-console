"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, MenuIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NightRidge } from "@/components/illustrations/night-ridge";
import { DocsProvider, type DocsEnv } from "@/features/docs/context";
import { DOC_SECTIONS, findPage, neighbours, searchPages } from "@/features/docs/nav";
import { DocContent } from "@/features/docs/registry";

function DocsSearch({ docHref, onNavigate }: { docHref: DocsEnv["docHref"]; onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchPages(query);

  // "/" jumps to search, like most docs sites.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Escape") {
            setQuery("");
          } else if (e.key === "Enter" && results[cursor]) {
            document.getElementById(`doc-result-${results[cursor]!.slug}`)?.click();
          }
        }}
        placeholder="Search docs"
        aria-label="Search docs"
        className="h-7 w-full rounded-md border border-border bg-transparent pr-6 pl-7 text-xs text-foreground outline-none placeholder:text-faint focus-visible:border-brand"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded-[3px] bg-raised px-1 font-mono text-[10px] text-faint" aria-hidden>
        /
      </kbd>
      {query.trim() ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-overlay py-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nothing matches. Try another word.</p>
          ) : (
            results.map((p, i) => (
              <Link
                key={p.slug}
                id={`doc-result-${p.slug}`}
                href={docHref(p.slug)}
                onClick={() => {
                  setQuery("");
                  onNavigate?.();
                }}
                className={cn("block px-3 py-1.5 transition-colors hover:bg-raised", i === cursor && "bg-raised")}
              >
                <span className="block text-xs font-medium text-foreground">{p.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{p.description}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function DocsNav({ slug, docHref, onNavigate }: { slug: string; docHref: DocsEnv["docHref"]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Documentation" className="space-y-5">
      {DOC_SECTIONS.map((s) => (
        <div key={s.title}>
          <p className="kicker mb-1.5 px-2">{s.title}</p>
          <ul className="space-y-px">
            {s.pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={docHref(p.slug)}
                  onClick={onNavigate}
                  aria-current={p.slug === slug ? "page" : undefined}
                  className={cn(
                    "block rounded-[4px] px-2 py-1 text-[13px] transition-colors",
                    p.slug === slug ? "bg-raised font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** "On this page", built from the rendered headings and following the scroll position. */
function OnThisPage({ slug, stickyClass }: { slug: string; stickyClass: string }) {
  const [items, setItems] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const article = document.getElementById("doc-article");
    if (!article) return;
    const seen = new Set<string>();
    let heads: HTMLElement[] = [];
    let signature = "";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        const first = heads.find((h) => seen.has(h.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-64px 0px -70% 0px" },
    );
    function scan() {
      heads = Array.from(article!.querySelectorAll<HTMLElement>("h2[id], h3[id]"));
      const next = heads.map((h) => h.id).join("|");
      if (next === signature) return;
      signature = next;
      setItems(heads.map((h) => ({ id: h.id, text: (h.textContent ?? "").replace(/#$/, "").trim(), level: h.tagName === "H2" ? 2 : 3 })));
      setActive((a) => (a && heads.some((h) => h.id === a) ? a : (heads[0]?.id ?? null)));
      io.disconnect();
      heads.forEach((h) => io.observe(h));
    }
    const frame = requestAnimationFrame(scan);
    const watcher = new MutationObserver(scan);
    watcher.observe(article, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
      io.disconnect();
    };
  }, [slug]);

  if (items.length < 2) return null;
  return (
    <div className={cn("hidden w-52 shrink-0 xl:block", stickyClass)}>
      <p className="kicker mb-2">On this page</p>
      <ul className="space-y-1 border-l border-border">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={cn(
                "-ml-px block border-l py-0.5 text-xs transition-colors",
                i.level === 3 ? "pl-5" : "pl-3",
                active === i.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The docs, in either scope. Three columns: navigation, the page, and what's on it.
 * `stickyTop` is the height of whatever chrome sits above, so the rails stick below it.
 */
export function DocsShell({ env, slug, stickyClass }: { env: DocsEnv; slug: string; stickyClass: string }) {
  const page = findPage(slug);
  const { prev, next } = neighbours(slug);
  const [navOpen, setNavOpen] = useState(false);
  const isHome = slug === "";

  if (!page) {
    return (
      <DocsProvider value={env}>
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <p className="display text-3xl text-foreground">That page isn&apos;t here</p>
          <p className="mt-2 text-sm text-muted-foreground">It may have moved.</p>
          <Button size="sm" className="mt-5" render={<Link href={env.docHref("")} />}>
            Docs home
          </Button>
        </div>
      </DocsProvider>
    );
  }

  return (
    <DocsProvider value={env}>
      {isHome ? (
        <div className="relative isolate overflow-hidden border-b border-border">
          <NightRidge tone="plum" />
          <div className="absolute inset-0 bg-linear-to-r from-[#0f0b1a] via-[#0f0b1a]/70 to-transparent" aria-hidden />
          <div className="relative z-10 mx-auto max-w-[1320px] px-6 pt-14 pb-28 lg:px-8">
            <p className="kicker text-white/70!">Documentation</p>
            <h1 className="display mt-3 max-w-2xl text-5xl text-white">Build on durable agents</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
              One request out, one callback in. Everything between them is on us.
            </p>
            <Button className="mt-5" render={<Link href={env.docHref("quickstart")} />}>
              Start the quickstart
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1320px] gap-10 px-4 lg:px-8">
        <aside className={cn("hidden w-52 shrink-0 lg:block", stickyClass)}>
          <div className="max-h-[calc(100svh-7rem)] space-y-4 overflow-y-auto pr-1 pb-4">
            <DocsSearch docHref={env.docHref} />
            <DocsNav slug={slug} docHref={env.docHref} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 py-8">
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm">
                    <MenuIcon />
                    Docs menu
                  </Button>
                }
              />
              <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                <SheetTitle className="sr-only">Documentation</SheetTitle>
                <div className="mt-6 space-y-4">
                  <DocsSearch docHref={env.docHref} onNavigate={() => setNavOpen(false)} />
                  <DocsNav slug={slug} docHref={env.docHref} onNavigate={() => setNavOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <article id="doc-article" className="mx-auto max-w-3xl">
            {isHome ? null : (
              <header className="mb-6 border-b border-hairline pb-5">
                <h1 className="display text-[38px] text-foreground">{page.title}</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">{page.description}</p>
              </header>
            )}
            <DocContent slug={slug} />

            <footer className="mt-14 grid gap-3 border-t border-hairline pt-5 sm:grid-cols-2">
              {prev ? (
                <Link href={env.docHref(prev.slug)} className="tile tile-link group block p-3">
                  <span className="flex items-center gap-1 text-[11px] text-faint">
                    <ArrowLeftIcon className="size-3" /> Previous
                  </span>
                  <span className="mt-0.5 block text-[13px] font-medium text-foreground">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={env.docHref(next.slug)} className="tile tile-link group block p-3 text-right">
                  <span className="flex items-center justify-end gap-1 text-[11px] text-faint">
                    Next <ArrowRightIcon className="size-3" />
                  </span>
                  <span className="mt-0.5 block text-[13px] font-medium text-foreground">{next.title}</span>
                </Link>
              ) : null}
            </footer>
          </article>
        </div>

        <OnThisPage slug={slug} stickyClass={stickyClass} />
      </div>
    </DocsProvider>
  );
}
