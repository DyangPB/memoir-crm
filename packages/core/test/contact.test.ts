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
        location: null,
        roleCompany: null,
        timezone: null,
        cadenceDays: null,
        cadenceTracked: true,
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
        location: null,
        roleCompany: null,
        timezone: null,
        cadenceDays: null,
        cadenceTracked: true,
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
        location: null,
        roleCompany: null,
        timezone: null,
        cadenceDays: null,
        cadenceTracked: true,
      },
    });
  });
});

describe("parseContactInput Cadence", () => {
  it("carries a Cadence override and opt-out through", () => {
    const result = parseContactInput({ name: "Ada", cadenceDays: 14, cadenceTracked: false });

    expect(result).toMatchObject({
      ok: true,
      contact: { name: "Ada", cadenceDays: 14, cadenceTracked: false },
    });
  });

  it("rejects an invalid Cadence", () => {
    const result = parseContactInput({ name: "Ada", cadenceDays: 0 });

    expect(result.ok).toBe(false);
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

describe("parseContactInput profile fields", () => {
  it("keeps a trimmed location, role/company, and timezone", () => {
    const result = parseContactInput({
      name: "Bob Nguyen",
      location: "  Lisbon, Portugal ",
      roleCompany: " Engineer at Acme ",
      timezone: " Europe/Lisbon ",
    });

    expect(result).toMatchObject({
      ok: true,
      contact: {
        location: "Lisbon, Portugal",
        roleCompany: "Engineer at Acme",
        timezone: "Europe/Lisbon",
      },
    });
  });

  it("leaves them null when absent or blank", () => {
    expect(parseContactInput({ name: "Ada" })).toMatchObject({
      ok: true,
      contact: { location: null, roleCompany: null, timezone: null },
    });
    expect(
      parseContactInput({ name: "Ada", location: "  ", roleCompany: "", timezone: " " }),
    ).toMatchObject({
      ok: true,
      contact: { location: null, roleCompany: null, timezone: null },
    });
  });

  it("stores a timezone under its canonical name", () => {
    expect(parseContactInput({ name: "Ada", timezone: "europe/lisbon" })).toMatchObject({
      ok: true,
      contact: { timezone: "Europe/Lisbon" },
    });
    expect(parseContactInput({ name: "Ada", timezone: "UTC" })).toMatchObject({
      ok: true,
      contact: { timezone: "UTC" },
    });
  });

  it("rejects a timezone that isn't an IANA name", () => {
    const message = "That timezone isn't one I know. Use a name like Europe/Lisbon.";

    expect(parseContactInput({ name: "Ada", timezone: "Mars/Olympus" })).toEqual({
      ok: false,
      message,
    });
    expect(parseContactInput({ name: "Ada", timezone: "GMT+2" })).toEqual({ ok: false, message });
    expect(parseContactInput({ name: "Ada", timezone: 7 })).toEqual({ ok: false, message });
  });

  it("rejects a location or role/company that is too long or not text", () => {
    expect(parseContactInput({ name: "Ada", location: "x".repeat(201) })).toEqual({
      ok: false,
      message: "That location is too long. Keep it under 200 characters.",
    });
    expect(parseContactInput({ name: "Ada", roleCompany: "x".repeat(201) })).toEqual({
      ok: false,
      message: "That role or company is too long. Keep it under 200 characters.",
    });
    expect(parseContactInput({ name: "Ada", location: 4 })).toEqual({
      ok: false,
      message: "Location needs to be text.",
    });
    expect(parseContactInput({ name: "Ada", roleCompany: 4 })).toEqual({
      ok: false,
      message: "Role or company needs to be text.",
    });
  });
});
