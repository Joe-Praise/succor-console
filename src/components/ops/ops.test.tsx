import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { DataTable } from "./data-table";
import { KpiCard, StatusTriplet, DeliveryBadge } from "./primitives";

interface Row {
  id: string;
  name: string;
}

describe("DataTable row navigation", () => {
  const rows: Row[] = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
  ];

  it("makes every row a real link with an accessible name", () => {
    render(
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `/things/${r.id}`}
        getRowLabel={(r) => `Open ${r.name}`}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
      />,
    );
    const link = screen.getByRole("link", { name: "Open Alpha" });
    expect(link).toHaveAttribute("href", "/things/a");
    expect(screen.getByRole("link", { name: "Open Beta" })).toHaveAttribute("href", "/things/b");
  });

  it("lifts interactive cells above the row link and keeps their own click", async () => {
    const onRevoke = vi.fn();
    render(
      <DataTable
        rows={rows.slice(0, 1)}
        getRowKey={(r) => r.id}
        getRowHref={(r) => `/things/${r.id}`}
        columns={[
          { id: "name", header: "Name", cell: (r) => r.name },
          { id: "act", header: "", interactive: true, cell: () => <button onClick={onRevoke}>Revoke</button> },
        ]}
      />,
    );
    const btn = screen.getByRole("button", { name: "Revoke" });
    expect(btn.closest("td")).toHaveClass("relative", "z-10");
    await userEvent.click(btn);
    expect(onRevoke).toHaveBeenCalledTimes(1);
  });

  it("renders no link for a row without a page", () => {
    render(
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        getRowHref={() => null}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
      />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows the empty state, and the error state with a retry", async () => {
    const { rerender } = render(
      <DataTable rows={[]} getRowKey={(r: Row) => r.id} columns={[]} empty={<p>Nothing yet</p>} />,
    );
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    const retry = vi.fn();
    rerender(
      <DataTable rows={[]} getRowKey={(r: Row) => r.id} columns={[]} error={{ message: "Couldn't load.", onRetry: retry }} />,
    );
    expect(screen.getByText("Couldn't load.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalled();
  });
});

describe("KpiCard", () => {
  it("shows an explicit unavailable reason instead of a fake value", () => {
    render(<KpiCard label="p95 duration" value="0 ms" unavailable="No runs in this window" />);
    expect(screen.getByText("No runs in this window")).toBeInTheDocument();
    expect(screen.queryByText("0 ms")).not.toBeInTheDocument();
  });

  it("colors a delta by whether the direction is good", () => {
    const { rerender } = render(<KpiCard label="Failure rate" value="2%" delta={0.5} goodWhen="down" />);
    expect(screen.getByText("+50.0%")).toHaveClass("text-error");
    rerender(<KpiCard label="Runs" value="10" delta={0.5} goodWhen="up" />);
    expect(screen.getByText("+50.0%")).toHaveClass("text-success");
  });
});

describe("status separation", () => {
  it("shows job, outcome and delivery as three distinct statuses", () => {
    render(
      <StatusTriplet
        jobStatus="succeeded"
        runStatus="success"
        delivery={{ status: "dead", attempt: 3, error: "HTTP 503" }}
      />,
    );
    expect(screen.getByText("Job")).toBeInTheDocument();
    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByText("Dead-lettered")).toBeInTheDocument();
  });

  it("labels a ready-with-error delivery as a scheduled retry", () => {
    render(<DeliveryBadge delivery={{ status: "ready", error: "HTTP 503", attempt: 1 }} />);
    expect(screen.getByText("Retry scheduled")).toBeInTheDocument();
  });
});
