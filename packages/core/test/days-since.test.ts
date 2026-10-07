import { describe, expect, it } from "vitest";

import { daysSince } from "../src/days-since";

describe("daysSince", () => {
  it("is 0 for the same instant", () => {
    const at = new Date("2026-10-07T12:00:00.000Z");

    expect(daysSince(at, at)).toBe(0);
  });

  it("is 0 for two times on the same day", () => {
    const early = new Date("2026-10-07T01:00:00.000Z");
    const late = new Date("2026-10-07T23:00:00.000Z");

    expect(daysSince(early, late)).toBe(0);
  });

  it("counts one whole calendar day", () => {
    const from = new Date("2026-10-06T22:00:00.000Z");
    const now = new Date("2026-10-07T02:00:00.000Z");

    expect(daysSince(from, now)).toBe(1);
  });

  it("counts across a month boundary", () => {
    const from = new Date("2026-09-26T09:00:00.000Z");
    const now = new Date("2026-10-10T09:00:00.000Z");

    expect(daysSince(from, now)).toBe(14);
  });

  it("clamps a future date to 0", () => {
    const from = new Date("2026-11-01T09:00:00.000Z");
    const now = new Date("2026-10-07T09:00:00.000Z");

    expect(daysSince(from, now)).toBe(0);
  });

  it("ignores the time of day when the dates differ", () => {
    const from = new Date("2026-10-07T23:59:00.000Z");
    const now = new Date("2026-10-08T00:01:00.000Z");

    expect(daysSince(from, now)).toBe(1);
  });
});
