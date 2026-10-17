import { describe, expect, it } from "vitest";

import { localTime } from "../src/local-time";

const NOON_UTC = new Date("2026-10-17T12:00:00.000Z");

describe("localTime", () => {
  it("shows the wall-clock time in a timezone", () => {
    expect(localTime("Europe/Lisbon", NOON_UTC)).toBe("13:00");
    expect(localTime("America/New_York", NOON_UTC)).toBe("08:00");
  });

  it("handles half-hour offsets", () => {
    expect(localTime("Asia/Kolkata", NOON_UTC)).toBe("17:30");
  });

  it("rolls past midnight into the next day", () => {
    expect(localTime("Pacific/Auckland", NOON_UTC)).toBe("01:00");
  });

  it("writes midnight as 00, not 24", () => {
    expect(localTime("UTC", new Date("2026-10-17T00:05:00.000Z"))).toBe("00:05");
  });

  it("follows daylight saving", () => {
    expect(localTime("Europe/Lisbon", new Date("2026-12-17T12:00:00.000Z"))).toBe("12:00");
    expect(localTime("Europe/Lisbon", new Date("2026-07-17T12:00:00.000Z"))).toBe("13:00");
  });

  it("returns null for a timezone it doesn't know", () => {
    expect(localTime("Mars/Olympus", NOON_UTC)).toBeNull();
  });
});
