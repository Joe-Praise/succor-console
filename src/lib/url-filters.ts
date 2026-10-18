"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Shareable list state in the URL: filters, time ranges and tabs survive reloads,
 * back/forward and copy-pasted links. Pages that use this must render under a
 * <Suspense> boundary (Next 16 requirement for useSearchParams).
 */

/** Read the given keys from a query string (missing → ""). Pure, for tests. */
export function parseFilters<K extends string>(search: URLSearchParams, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of keys) out[k] = search.get(k) ?? "";
  return out;
}

/** Apply a patch to a query string; empty/null values are removed. Pure, for tests. */
export function applyFilterPatch(
  search: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") next.delete(k);
    else next.set(k, v);
  }
  return next;
}

export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const serialized = params.toString();

  const values = useMemo(
    () => parseFilters(new URLSearchParams(serialized), keys),
    // keys is a module-level constant at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serialized],
  );

  const set = useCallback(
    (patch: Partial<Record<K, string | null>>) => {
      const next = applyFilterPatch(new URLSearchParams(serialized), patch as Record<string, string | null>);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [serialized, pathname, router],
  );

  const reset = useCallback(() => {
    const next = applyFilterPatch(
      new URLSearchParams(serialized),
      Object.fromEntries(keys.map((k) => [k, null])),
    );
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, pathname, router]);

  const active = keys.filter((k) => values[k] !== "").length;
  return { values, set, reset, active, queryString: serialized };
}
