import type { z } from "zod";

/**
 * BFF client layer (§5.1). Components never fetch directly — they call typed
 * request fns in `api/*`, which call this. Every call goes to `/api/bff/*`
 * (same-origin), which proxies to agent-service with the cookie JWT attached.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageFrom(status: number, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  if (status === 401) return "Not authenticated";
  if (status === 402) return "Budget exceeded";
  if (status === 403) return "You don't have access to this resource";
  return `Request failed (${status})`;
}

interface RequestOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Zod schema — validates the response at the BFF boundary (§5.1). */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
}

export async function bff<T = unknown>(
  path: string,
  { method = "GET", body, schema, signal }: RequestOptions<T> = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: "same-origin",
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, messageFrom(res.status, data), data);
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(res.status, "Unexpected response from server", parsed.error);
    }
    return parsed.data;
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
