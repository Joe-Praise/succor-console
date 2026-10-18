import { describe, it, expect } from "vitest";

import { usd, usdPrecise, duration, shortId, relativeTime, percent, delta, compactNumber } from "./format";
import { deliveryLabel, deliveryTone, toneOf, TERMINAL_DELIVERY_STATUSES } from "./status";

describe("money", () => {
  it("formats totals with two decimals", () => {
    expect(usd(12.4)).toBe("$12.40");
    expect(usd(null)).toBe("—");
  });

  it("keeps sub-cent per-run charges visible", () => {
    expect(usdPrecise(0.0021)).toBe("$0.0021");
    expect(usdPrecise(0.000123)).toBe("$0.000123");
    expect(usdPrecise(0.013)).toBe("$0.0130");
    expect(usdPrecise(0)).toBe("$0.00");
    expect(usdPrecise(3.5)).toBe("$3.50");
    expect(usdPrecise(undefined)).toBe("—");
  });
});

describe("duration + ids + time", () => {
  it("formats durations across scales", () => {
    expect(duration(840)).toBe("840 ms");
    expect(duration(2_345)).toBe("2.35 s");
    expect(duration(12_400)).toBe("12.4 s");
    expect(duration(185_000)).toBe("3m 05s");
    expect(duration(-1)).toBe("—");
  });

  it("shortens ids consistently", () => {
    expect(shortId("6710f3c2a9d4e81b2c0f4a17")).toBe("…2c0f4a17");
    expect(shortId("abc")).toBe("abc");
  });

  it("formats relative time against an injected clock", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(relativeTime("2026-10-18T11:57:00Z", now)).toBe("3 min ago");
    expect(relativeTime("2026-10-18T09:00:00Z", now)).toBe("3 h ago");
  });

  it("formats ratios and deltas", () => {
    expect(percent(0.9765)).toBe("97.7%");
    expect(delta(150, 100)).toBeCloseTo(0.5);
    expect(delta(10, 0)).toBeNull();
    expect(compactNumber(1_670_000)).toBe("1.67M");
  });
});

describe("delivery vocabulary", () => {
  it("treats `failed` as terminal and a ready-with-error row as a scheduled retry", () => {
    expect(TERMINAL_DELIVERY_STATUSES.has("failed")).toBe(true);
    expect(deliveryLabel({ status: "failed" })).toBe("Failed (not retried)");
    expect(deliveryLabel({ status: "ready", error: "HTTP 503", attempt: 1 })).toBe("Retry scheduled");
    expect(deliveryTone({ status: "ready", error: "HTTP 503", attempt: 1 })).toBe("warning");
    expect(deliveryLabel({ status: "ready", error: null, attempt: 0 })).toBe("Queued to deliver");
  });

  it("maps statuses to tones", () => {
    expect(toneOf("running")).toBe("info");
    expect(toneOf("pending_approval")).toBe("warning");
    expect(toneOf("dead")).toBe("error");
    expect(toneOf("whatever")).toBe("neutral");
  });
});
