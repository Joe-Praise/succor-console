"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
  headerClassName?: string;
  /**
   * The cell holds its own controls (buttons, menus, switches, copy). It is lifted
   * above the row link so clicking it acts on the control instead of navigating.
   */
  interactive?: boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  /** Where the whole row navigates. Return null for a row with no page. */
  getRowHref?: (row: T) => string | null;
  /** Accessible name for the row link (defaults to "Open"). */
  getRowLabel?: (row: T) => string;
  loading?: boolean;
  /** Pass the query error state; renders a retry affordance. */
  error?: { message: string; onRetry?: () => void } | null;
  /** Rendered when there are no rows (and not loading/error). */
  empty?: React.ReactNode;
  skeletonRows?: number;
  className?: string;
  /** Rendered under the table (e.g. a cursor pager). */
  footer?: React.ReactNode;
}

/**
 * The console's one table. Dense rows, sticky header, and the ROW-NAVIGATION
 * STANDARD: when `getRowHref` returns a URL, the whole row is a link — implemented
 * as a real <Link> stretched over the row (so cmd/middle-click, prefetch, keyboard
 * Enter and screen readers all work), with `interactive` cells lifted above it.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  getRowHref,
  getRowLabel,
  loading,
  error,
  empty,
  skeletonRows = 6,
  className,
  footer,
}: DataTableProps<T>) {
  if (error) return <QueryError message={error.message} onRetry={error.onRetry} />;

  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="tile overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  className={cn(c.align === "right" && "text-right", c.headerClassName)}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                    {columns.map((c) => (
                      <TableCell key={c.id}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => {
                  const href = getRowHref?.(row) ?? null;
                  return (
                    <TableRow
                      key={getRowKey(row)}
                      className={cn(
                        "relative",
                        href && "cursor-pointer hover:bg-raised/70 focus-within:bg-raised/70",
                      )}
                    >
                      {columns.map((c, i) => (
                        <TableCell
                          key={c.id}
                          className={cn(
                            c.align === "right" && "text-right tabular-nums",
                            c.interactive && "relative z-10",
                            c.className,
                          )}
                        >
                          {i === 0 && href ? (
                            <Link
                              href={href}
                              aria-label={getRowLabel?.(row) ?? "Open"}
                              className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                            />
                          ) : null}
                          {c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
      {footer}
    </div>
  );
}

/** Stop a click inside an interactive cell from reaching anything row-level. */
export function stopRowNav(e: React.SyntheticEvent) {
  e.stopPropagation();
}
