import { Fragment, type ReactNode } from "react";

/**
 * A small, dependency-free syntax tinter for the snippets this console shows (JSON,
 * JS/TS, shell, Python, dotenv, HTTP). It colours tokens; it does not parse. Anything
 * it doesn't recognise renders as plain text, so a wrong guess is only ever less
 * colourful, never wrong.
 */

export type CodeLang = "json" | "js" | "bash" | "python" | "env" | "http" | "text";

const TOKEN_CLASS = {
  str: "text-success",
  key: "text-info",
  kw: "text-brand",
  num: "text-warning",
  com: "text-faint italic",
  fn: "text-chart-3",
} as const;
type Token = keyof typeof TOKEN_CLASS;

const KEYWORDS: Partial<Record<CodeLang, string>> = {
  js: "const|let|var|await|async|function|return|if|else|import|from|export|default|new|throw|try|catch|for|of|typeof|true|false|null|undefined",
  python: "def|return|if|else|elif|import|from|async|await|raise|class|None|True|False|for|in|with|as|try|except",
  bash: "curl|export|npm|npx|node|echo",
  http: "GET|POST|PUT|PATCH|DELETE",
};

/** Ordered rules: the first alternative that matches at a position wins. */
function rulesFor(lang: CodeLang): Array<[Token, string]> {
  const strings = `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`;
  switch (lang) {
    case "json":
      return [
        ["key", `"(?:[^"\\\\\\n]|\\\\.)*"(?=\\s*:)`],
        ["str", `"(?:[^"\\\\\\n]|\\\\.)*"`],
        ["kw", `\\b(?:true|false|null)\\b`],
        ["num", `-?\\b\\d+(?:\\.\\d+)?\\b`],
      ];
    case "env":
      return [
        ["com", `#[^\\n]*`],
        ["key", `^[A-Z][A-Z0-9_]*(?==)`],
        ["str", `(?<==)[^\\n]+`],
      ];
    case "bash":
      return [
        ["com", `(?:^|(?<=\\s))#[^\\n]*`],
        ["str", strings],
        ["key", `(?:^|(?<=\\s))-{1,2}[a-zA-Z][\\w-]*`],
        ["num", `\\$\\{?[A-Z_][A-Z0-9_]*\\}?`],
        ["kw", `\\b(?:${KEYWORDS.bash})\\b`],
      ];
    case "python":
      return [
        ["com", `#[^\\n]*`],
        ["str", `f?${strings}`],
        ["kw", `\\b(?:${KEYWORDS.python})\\b`],
        ["fn", `@[\\w.]+|\\b[a-zA-Z_]\\w*(?=\\()`],
        ["num", `\\b\\d+(?:\\.\\d+)?\\b`],
      ];
    case "http":
      return [
        ["kw", `\\b(?:${KEYWORDS.http})\\b`],
        ["key", `^[A-Za-z][\\w-]*(?=:)`],
        ["str", `"(?:[^"\\\\\\n]|\\\\.)*"`],
        ["num", `\\b\\d{3}\\b`],
      ];
    case "js":
      return [
        ["com", `\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/`],
        ["str", `${strings}|\`(?:[^\`\\\\]|\\\\.)*\``],
        ["kw", `\\b(?:${KEYWORDS.js})\\b`],
        ["fn", `\\b[a-zA-Z_$][\\w$]*(?=\\()`],
        ["key", `\\b[a-zA-Z_$][\\w$]*(?=\\s*:)`],
        ["num", `\\b\\d+(?:\\.\\d+)?\\b`],
      ];
    default:
      return [];
  }
}

export function tokenize(code: string, lang: CodeLang): Array<{ t: Token | null; v: string }> {
  const rules = rulesFor(lang);
  if (rules.length === 0) return [{ t: null, v: code }];
  const re = new RegExp(rules.map(([, src]) => `(${src})`).join("|"), "gm");
  const out: Array<{ t: Token | null; v: string }> = [];
  let last = 0;
  for (const m of code.matchAll(re)) {
    const i = m.index ?? 0;
    if (m[0].length === 0) continue;
    if (i > last) out.push({ t: null, v: code.slice(last, i) });
    const group = m.slice(1).findIndex((g) => g !== undefined);
    out.push({ t: rules[group]?.[0] ?? null, v: m[0] });
    last = i + m[0].length;
  }
  if (last < code.length) out.push({ t: null, v: code.slice(last) });
  return out;
}

export function highlight(code: string, lang: CodeLang): ReactNode {
  return tokenize(code, lang).map((tok, i) =>
    tok.t ? (
      <span key={i} className={TOKEN_CLASS[tok.t]}>
        {tok.v}
      </span>
    ) : (
      <Fragment key={i}>{tok.v}</Fragment>
    ),
  );
}

/** Best guess from the caption and the first characters. */
export function inferLang(code: string, label?: string): CodeLang {
  const l = (label ?? "").toLowerCase();
  const head = code.trimStart().slice(0, 12);
  if (l.includes(".env") || l === "env") return "env";
  if (/\.py\b/.test(l) || /\bpython\b/.test(l)) return "python";
  if (/\.(ts|tsx|js|jsx|mjs)\b/.test(l) || /\bnode\b|\bserver-side\b/.test(l)) return "js";
  if (/\b(curl|shell|bash|terminal)\b/.test(l) || head.startsWith("curl")) return "bash";
  if (/^(GET|POST|PUT|PATCH|DELETE)\s\//.test(head)) return "http";
  if (head.startsWith("{") || head.startsWith("[")) return "json";
  if (/^(import|const|export|await|async|function|\/\/)/.test(head)) return "js";
  if (/^(from|def|@app)\b/.test(head)) return "python";
  if (/^[A-Z][A-Z0-9_]*=/.test(head)) return "env";
  return "text";
}
