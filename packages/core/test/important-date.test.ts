import { describe, expect, it } from "vitest";

import {
  daysUntilOccurrence,
  importantDateYears,
  nextOccurrence,
  occursWithinDays,
  parseImportantDateInput,
} from "../src/important-date";

describe("parseImportantDateInput", () => {
  it("accepts a name and a date", () => {
    expect(parseImportantDateInput({ name: "Birthday", fallsOn: "1985-03-14" })).toEqual({
      ok: true,
      importantDate: { name: "Birthday", fallsOn: "1985-03-14" },
    });
  });

  it("trims the name", () => {
    expect(parseImportantDateInput({ name: "  First met  ", fallsOn: "2015-06-01" })).toEqual({
      ok: true,
      importantDate: { name: "First met", fallsOn: "2015-06-01" },
    });
  });

  it("rejects a blank name", () => {
    expect(parseImportantDateInput({ name: "   ", fallsOn: "1985-03-14" })).toEqual({
      ok: false,
      message: "Add a name for this date.",
    });
  });

  it("rejects a name that is too long", () => {
    expect(parseImportantDateInput({ name: "x".repeat(81), fallsOn: "1985-03-14" })).toEqual({
      ok: false,
      message: "That name is too long. Keep it under 80 characters.",
    });
  });

  it("rejects an impossible or missing date", () => {
    expect(parseImportantDateInput({ name: "Birthday", fallsOn: "2026-02-31" })).toEqual({
      ok: false,
      message: "Important Dates need a real date.",
    });
    expect(parseImportantDateInput({ name: "Birthday" })).toEqual({
      ok: false,
      message: "Important Dates need a real date.",
    });
  });

  it("rejects a payload that isn't JSON", () => {
    expect(parseImportantDateInput(null)).toEqual({
      ok: false,
      message: "Send the important date as JSON.",
    });
  });
});

describe("nextOccurrence", () => {
  it("stays in this year when the day is still ahead", () => {
    expect(nextOccurrence("1985-03-14", new Date("2026-01-05T09:30:00.000Z"))).toBe("2026-03-14");
  });

  it("rolls to next year once the day has passed", () => {
    expect(nextOccurrence("1985-03-14", new Date("2026-04-01T09:30:00.000Z"))).toBe("2027-03-14");
  });

  it("counts today as the next occurrence", () => {
    expect(nextOccurrence("1985-03-14", new Date("2026-03-14T00:00:00.000Z"))).toBe("2026-03-14");
    expect(nextOccurrence("1985-03-14", new Date("2026-03-14T23:59:59.999Z"))).toBe("2026-03-14");
  });

  it("moves to the next year at the first moment after the day", () => {
    expect(nextOccurrence("1985-03-14", new Date("2026-03-15T00:00:00.000Z"))).toBe("2027-03-14");
  });

  it("ignores the original year and keeps the day and month", () => {
    expect(nextOccurrence("1900-12-25", new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12-25");
  });

  it("keeps a 29 February on the 29th during a leap year", () => {
    expect(nextOccurrence("2000-02-29", new Date("2028-01-15T00:00:00.000Z"))).toBe("2028-02-29");
  });

  it("clamps a 29 February to the 28th in a common year", () => {
    expect(nextOccurrence("2000-02-29", new Date("2026-01-15T00:00:00.000Z"))).toBe("2026-02-28");
  });

  it("clamps a 29 February after the 28th has passed", () => {
    expect(nextOccurrence("2000-02-29", new Date("2026-03-01T00:00:00.000Z"))).toBe("2027-02-28");
  });
});

describe("daysUntilOccurrence", () => {
  it("is 0 on the day itself", () => {
    expect(daysUntilOccurrence("1985-03-14", new Date("2026-03-14T18:00:00.000Z"))).toBe(0);
  });

  it("counts whole days ahead", () => {
    expect(daysUntilOccurrence("1985-03-14", new Date("2026-03-12T18:00:00.000Z"))).toBe(2);
  });

  it("counts across the end of the year", () => {
    expect(daysUntilOccurrence("2020-01-02", new Date("2026-12-30T12:00:00.000Z"))).toBe(3);
  });

  it("counts nearly a full year once the day has passed", () => {
    expect(daysUntilOccurrence("1985-03-14", new Date("2026-03-15T00:00:00.000Z"))).toBe(364);
  });
});

describe("occursWithinDays", () => {
  const now = new Date("2026-10-12T08:00:00.000Z");

  it("includes today", () => {
    expect(occursWithinDays("1990-10-12", now, 7)).toBe(true);
  });

  it("includes the last day of the window", () => {
    expect(occursWithinDays("1990-10-19", now, 7)).toBe(true);
  });

  it("excludes the day after the window", () => {
    expect(occursWithinDays("1990-10-20", now, 7)).toBe(false);
  });

  it("excludes a day that already passed this year", () => {
    expect(occursWithinDays("1990-10-11", now, 7)).toBe(false);
  });

  it("reaches across the end of the year", () => {
    expect(occursWithinDays("1990-01-01", new Date("2026-12-29T00:00:00.000Z"), 7)).toBe(true);
  });

  it("treats a zero-day window as today only", () => {
    expect(occursWithinDays("1990-10-12", now, 0)).toBe(true);
    expect(occursWithinDays("1990-10-13", now, 0)).toBe(false);
  });
});

describe("importantDateYears", () => {
  it("counts the years turned while the day is still ahead", () => {
    expect(importantDateYears("1985-03-14", new Date("2026-01-05T00:00:00.000Z"))).toBe(41);
  });

  it("counts one more once the day has passed", () => {
    expect(importantDateYears("1985-03-14", new Date("2026-04-01T00:00:00.000Z"))).toBe(42);
  });

  it("is 0 on the day itself", () => {
    expect(importantDateYears("2026-03-14", new Date("2026-03-14T00:00:00.000Z"))).toBe(0);
  });

  it("never goes negative for a date in the future", () => {
    expect(importantDateYears("2027-06-01", new Date("2026-01-05T00:00:00.000Z"))).toBe(0);
  });

  it("never goes negative on the day itself in the future", () => {
    expect(importantDateYears("2026-06-01", new Date("2026-06-01T00:00:00.000Z"))).toBe(0);
  });
});
