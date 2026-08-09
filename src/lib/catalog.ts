/**
 * The catalog's `endpoint` field bakes the HTTP method into the string
 * (e.g. `"POST /agents/campaign-writer"`). Split it so the UI doesn't print a
 * second method or mangle the path when building a URL.
 */
export function parseEndpoint(endpoint: string): { method: string; path: string } {
  const m = endpoint.trim().match(/^([A-Z]+)\s+(.*)$/);
  return m ? { method: m[1], path: m[2] } : { method: "POST", path: endpoint.trim() };
}
