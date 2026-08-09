/**
 * Serialize a header row + data rows to an RFC-4180-ish CSV string. Values
 * containing quotes, commas, or newlines are quoted and inner quotes doubled.
 */
export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n");
}

/** Trigger a browser download of `content` as `filename`. Client-only. */
export function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
