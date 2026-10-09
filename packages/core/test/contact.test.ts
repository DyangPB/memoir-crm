import { describe, expect, it } from "vitest";

import { letterFor, parseContactInput } from "../src/contact";

const FULL_INPUT = {
  name: "  Bob Nguyen  ",
  emails: [" bob@example.com ", ""],
  phones: ["+1 555 0100"],
  socialLinks: [{ label: "Instagram", url: "instagram.com/bob" }],
  birthday: "1990-05-14",
  howWeMet: "  Neighbours in Lisbon  ",
};

describe("parseContactInput", () => {
  it("normalizes a full contact", () => {
    const result = parseContactInput(FULL_INPUT);

    expect(result).toEqual({
      ok: true,
      contact: {
        name: "Bob Nguyen",
        emails: ["bob@example.com"],
        phones: ["+1 555 0100"],
        socialLinks: [{ label: "Instagram", url: "https://instagram.com/bob" }],
        birthday: "1990-05-14",
        howWeMet: "Neighbours in Lisbon",
      },
    });
  });

  it("fills absent optional fields", () => {
    const result = parseContactInput({ name: "Ada" });

    expect(result).toEqual({
      ok: true,
      contact: {
        name: "Ada",
        emails: [],
        phones: [],
        socialLinks: [],
        birthday: null,
        howWeMet: null,
      },
    });
  });

  it("requires a name", () => {
    expect(parseContactInput({ name: "   " })).toEqual({
      ok: false,
      message: "Add a name for this contact.",
    });
  });

  it("rejects a malformed email", () => {
    const result = parseContactInput({ name: "Ada", emails: ["not-an-email"] });

    expect(result.ok).toBe(false);
  });

  it("rejects a malformed birthday", () => {
    expect(parseContactInput({ name: "Ada", birthday: "14-05-1990" }).ok).toBe(false);
    expect(parseContactInput({ name: "Ada", birthday: "1990-02-31" }).ok).toBe(false);
    expect(parseContactInput({ name: "Ada", birthday: "1990-02-28" }).ok).toBe(true);
  });

  it("requires both parts of a social link", () => {
    expect(parseContactInput({ name: "Ada", socialLinks: [{ label: "Instagram" }] }).ok).toBe(
      false,
    );
    expect(parseContactInput({ name: "Ada", socialLinks: [{ url: "example.com" }] }).ok).toBe(
      false,
    );
  });

  it("keeps an empty how-we-met as null", () => {
    const result = parseContactInput({ name: "Ada", howWeMet: "   " });

    expect(result).toEqual({
      ok: true,
      contact: {
        name: "Ada",
        emails: [],
        phones: [],
        socialLinks: [],
        birthday: null,
        howWeMet: null,
      },
    });
  });
});

describe("letterFor", () => {
  it("returns the uppercased first letter", () => {
    expect(letterFor("bob")).toBe("B");
    expect(letterFor("  ada lovelace")).toBe("A");
  });

  it("handles names starting with punctuation", () => {
    expect(letterFor("'Ines")).toBe("I");
  });

  it("falls back to a question mark for empty names", () => {
    expect(letterFor("   ")).toBe("?");
  });
});
