"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon, InfoIcon, LightbulbIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code-block";
import { useDocs } from "@/features/docs/context";
import { pollSnippet, requestSnippet, SNIPPET_LANGS, type SnippetLang } from "@/features/docs/snippets";
import type { CatalogEntry } from "@/types";

/** Stable anchor from heading text, so a section can be linked to. */
export function anchorOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function H2({ children }: { children: string }) {
  const id = anchorOf(children);
  return (
    <h2 id={id} className="group mt-11 mb-3 scroll-mt-20 text-xl font-semibold tracking-tight text-foreground first:mt-0">
      <a href={`#${id}`} className="no-underline">
        {children}
        <span className="ml-2 text-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
          #
        </span>
      </a>
    </h2>
  );
}

export function H3({ children }: { children: string }) {
  const id = anchorOf(children);
  return (
    <h3 id={id} className="mt-7 mb-2 scroll-mt-20 text-[15px] font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  );
}

export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("my-3 text-[14px] leading-[1.7] text-foreground/80", className)}>{children}</p>;
}

export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[3px] border border-border bg-raised px-1 py-px font-mono text-[12px] text-foreground">{children}</code>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="my-3 space-y-1.5 pl-1 text-[14px] leading-[1.65] text-foreground/80">{children}</ul>;
}

export function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[9px] size-1 shrink-0 rounded-full bg-brand" aria-hidden />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

const NOTE: Record<string, { icon: LucideIcon; cls: string; label: string }> = {
  note: { icon: InfoIcon, cls: "border-info/30 bg-info-bg [&>svg]:text-info", label: "Note" },
  tip: { icon: LightbulbIcon, cls: "border-success/30 bg-success-bg [&>svg]:text-success", label: "Tip" },
  warning: { icon: TriangleAlertIcon, cls: "border-warning/30 bg-warning-bg [&>svg]:text-warning", label: "Watch out" },
  danger: { icon: CircleAlertIcon, cls: "border-error/30 bg-error-bg [&>svg]:text-error", label: "Important" },
};

export function Note({ kind = "note", title, children }: { kind?: keyof typeof NOTE; title?: string; children: React.ReactNode }) {
  const n = NOTE[kind]!;
  return (
    <div className={cn("my-4 flex gap-3 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed text-foreground/85", n.cls)}>
      <n.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title ?? n.label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/** A link to another docs page, in the current scope. */
export function DocLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { docHref } = useDocs();
  const [slug, hash] = to.split("#");
  return (
    <Link href={`${docHref(slug ?? "")}${hash ? `#${hash}` : ""}`} className="text-brand underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

/** A link into the console inside a project; plain text on the public site. */
export function AppLink({ path, children }: { path: string; children: React.ReactNode }) {
  const { appHref } = useDocs();
  const href = appHref(path);
  return href ? (
    <Link href={href} className="text-brand underline-offset-2 hover:underline">
      {children}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{children}</span>
  );
}

/** A numbered step on the signal line. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="relative my-5 space-y-7 border-l border-border pl-6 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative [counter-increment:step]">
      <span
        className="absolute top-0 -left-[34px] grid size-5 place-items-center rounded-full border border-strong bg-background font-mono text-[10px] text-brand before:content-[counter(step)]"
        aria-hidden
      />
      <h3 id={anchorOf(title)} className="scroll-mt-20 text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="mt-1.5 [&>*:first-child]:mt-0">{children}</div>
    </li>
  );
}

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-mono text-[10.5px] font-normal tracking-[0.06em] text-faint uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-hairline align-top last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 leading-relaxed text-foreground/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardLink({ to, title, children, icon: Icon }: { to: string; title: string; children: React.ReactNode; icon?: LucideIcon }) {
  const { docHref } = useDocs();
  return (
    <Link href={docHref(to)} className="tile tile-link group block p-4">
      {Icon ? <Icon className="mb-2.5 size-4.5 text-brand" strokeWidth={1.75} aria-hidden /> : null}
      <p className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
        {title}
        <ArrowRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Language tabs. The choice is remembered across pages, so a Python reader isn't
// asked again on every snippet.
// ---------------------------------------------------------------------------

const LANG_KEY = "succor.docs.lang";
const LANG_EVENT = "succor-docs-lang";

function readLang(): SnippetLang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "node" || v === "python" || v === "curl" ? v : "curl";
  } catch {
    return "curl";
  }
}

function subscribeLang(onChange: () => void) {
  window.addEventListener(LANG_EVENT, onChange);
  return () => window.removeEventListener(LANG_EVENT, onChange);
}

export function useSnippetLang(): [SnippetLang, (l: SnippetLang) => void] {
  const lang = useSyncExternalStore(subscribeLang, readLang, () => "curl" as SnippetLang);
  return [
    lang,
    (l) => {
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {
        // Blocked storage: the choice just won't persist.
      }
      window.dispatchEvent(new Event(LANG_EVENT));
    },
  ];
}

export function LangTabs({ value, onChange }: { value: string; onChange: (id: SnippetLang) => void }) {
  return (
    <div role="tablist" aria-label="Language" className="flex items-center gap-0.5">
      {SNIPPET_LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="tab"
          aria-selected={value === l.id}
          onClick={() => onChange(l.id)}
          className={cn(
            "h-5 rounded-[3px] px-1.5 text-[11px] font-medium transition-colors",
            value === l.id ? "bg-raised text-foreground" : "text-faint hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

const SNIPPET_CODE_LANG = { curl: "bash", node: "js", python: "python" } as const;

/** The request for an agent, in the reader's language. */
export function RequestCode({ entry, body, label }: { entry: CatalogEntry; body: unknown; label?: string }) {
  const { serviceUrl } = useDocs();
  const [lang, setLang] = useSnippetLang();
  return (
    <CodeBlock
      className="my-4"
      code={requestSnippet(lang, serviceUrl, entry, body)}
      lang={SNIPPET_CODE_LANG[lang]}
      label={label ?? entry.endpoint}
      actions={<LangTabs value={lang} onChange={setLang} />}
    />
  );
}

export function PollCode() {
  const { serviceUrl } = useDocs();
  const [lang, setLang] = useSnippetLang();
  return (
    <CodeBlock
      className="my-4"
      code={pollSnippet(lang, serviceUrl)}
      lang={SNIPPET_CODE_LANG[lang]}
      label="GET /agents/jobs/:jobId"
      actions={<LangTabs value={lang} onChange={setLang} />}
    />
  );
}
