import { describe, expect, it } from "vitest";

import { ALL_PAGES, findPage, neighbours, searchPages } from "./nav";
import { hasContent } from "./registry";

describe("docs navigation", () => {
  it("has unique slugs", () => {
    const slugs = ALL_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a written page for every entry", () => {
    expect(ALL_PAGES.filter((p) => !hasContent(p.slug)).map((p) => p.slug)).toEqual([]);
  });

  it("finds pages and refuses unknown ones", () => {
    expect(findPage("callbacks")?.title).toBe("Receiving callbacks");
    expect(findPage("nope")).toBeNull();
  });

  it("walks prev and next, with none past the ends", () => {
    expect(neighbours("").prev).toBeNull();
    expect(neighbours("").next?.slug).toBe("quickstart");
    expect(neighbours(ALL_PAGES.at(-1)!.slug).next).toBeNull();
  });

  it("searches by the words people arrive with", () => {
    expect(searchPages("x-delivery-id")[0]?.slug).toBe("callbacks");
    expect(searchPages("402").map((p) => p.slug)).toContain("responses");
    expect(searchPages("   ")).toEqual([]);
  });

  it("ranks a title match first", () => {
    expect(searchPages("workflows")[0]?.slug).toBe("workflows");
  });
});
