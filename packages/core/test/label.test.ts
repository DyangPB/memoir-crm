import { describe, expect, it } from "vitest";

import { parseLabelInput } from "../src/label";
import { buildSearchQuery } from "../src/search";

describe("parseLabelInput", () => {
  it("normalizes a label name", () => {
    expect(parseLabelInput({ name: "  college friends  " })).toEqual({
      ok: true,
      name: "college friends",
    });
  });

  it("requires a name", () => {
    expect(parseLabelInput({ name: "   " })).toEqual({
      ok: false,
      message: "Add a name for this label.",
    });
  });

  it("caps the name length", () => {
    expect(parseLabelInput({ name: "a".repeat(51) }).ok).toBe(false);
  });
});

describe("buildSearchQuery", () => {
  it("is null for an empty search", () => {
    expect(buildSearchQuery("")).toBeNull();
    expect(buildSearchQuery("   ")).toBeNull();
  });

  it("makes every term a prefix match", () => {
    expect(buildSearchQuery("bob cof")).toBe('"bob"* "cof"*');
  });

  it("keeps quoted characters literal", () => {
    expect(buildSearchQuery('say "hi"')).toBe('"say"* """hi"""*');
  });

  it("collapses extra whitespace", () => {
    expect(buildSearchQuery("  bob   nguyen  ")).toBe('"bob"* "nguyen"*');
  });
});
