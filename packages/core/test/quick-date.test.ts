import { describe, expect, it } from "vitest";

import { parseQuickDate } from "../src/quick-date";

// 2026-10-17 is a Saturday.
const TODAY = "2026-10-17";

describe("parseQuickDate", () => {
  it("reads today, tomorrow, and a plain ISO day", () => {
    expect(parseQuickDate("today", TODAY)).toEqual({ ok: true, dueOn: "2026-10-17" });
    expect(parseQuickDate("tomorrow", TODAY)).toEqual({ ok: true, dueOn: "2026-10-18" });
    expect(parseQuickDate("2026-11-02", TODAY)).toEqual({ ok: true, dueOn: "2026-11-02" });
  });

  it("reads an offset in days or weeks", () => {
    expect(parseQuickDate("in 3 days", TODAY)).toEqual({ ok: true, dueOn: "2026-10-20" });
    expect(parseQuickDate("in 1 day", TODAY)).toEqual({ ok: true, dueOn: "2026-10-18" });
    expect(parseQuickDate("in 2 weeks", TODAY)).toEqual({ ok: true, dueOn: "2026-10-31" });
    expect(parseQuickDate("in 1 week", TODAY)).toEqual({ ok: true, dueOn: "2026-10-24" });
  });

  it("rolls an offset across a month and year end", () => {
    expect(parseQuickDate("in 20 days", TODAY)).toEqual({ ok: true, dueOn: "2026-11-06" });
    expect(parseQuickDate("in 100 days", TODAY)).toEqual({ ok: true, dueOn: "2027-01-25" });
  });

  it("reads a weekday as the next one after today", () => {
    expect(parseQuickDate("friday", TODAY)).toEqual({ ok: true, dueOn: "2026-10-23" });
    expect(parseQuickDate("next friday", TODAY)).toEqual({ ok: true, dueOn: "2026-10-23" });
    expect(parseQuickDate("next monday", TODAY)).toEqual({ ok: true, dueOn: "2026-10-19" });
    expect(parseQuickDate("sun", TODAY)).toEqual({ ok: true, dueOn: "2026-10-18" });
  });

  it("reads today's own weekday as a week from today", () => {
    expect(parseQuickDate("saturday", TODAY)).toEqual({ ok: true, dueOn: "2026-10-24" });
  });

  it("doesn't mistake a word that merely starts like a weekday for one", () => {
    expect(parseQuickDate("wedding", TODAY)).toEqual({ ok: false });
    expect(parseQuickDate("monster", TODAY)).toEqual({ ok: false });
  });

  it("reads a month and day, in either order, as the next time it comes round", () => {
    expect(parseQuickDate("Oct 28", TODAY)).toEqual({ ok: true, dueOn: "2026-10-28" });
    expect(parseQuickDate("28 October", TODAY)).toEqual({ ok: true, dueOn: "2026-10-28" });
    expect(parseQuickDate("oct 17", TODAY)).toEqual({ ok: true, dueOn: "2026-10-17" });
    expect(parseQuickDate("oct 5", TODAY)).toEqual({ ok: true, dueOn: "2027-10-05" });
    expect(parseQuickDate("jan 3", TODAY)).toEqual({ ok: true, dueOn: "2027-01-03" });
  });

  it("reads a month, day, and year as written", () => {
    expect(parseQuickDate("Oct 28, 2027", TODAY)).toEqual({ ok: true, dueOn: "2027-10-28" });
    expect(parseQuickDate("5 Mar 2028", TODAY)).toEqual({ ok: true, dueOn: "2028-03-05" });
  });

  it("refuses a day the month doesn't have", () => {
    expect(parseQuickDate("feb 30", TODAY)).toEqual({ ok: false });
    expect(parseQuickDate("oct 32", TODAY)).toEqual({ ok: false });
  });

  it("lands 29 February on the next leap year", () => {
    expect(parseQuickDate("feb 29", TODAY)).toEqual({ ok: true, dueOn: "2028-02-29" });
  });

  it("ignores case and surrounding whitespace", () => {
    expect(parseQuickDate("  Tomorrow ", TODAY)).toEqual({ ok: true, dueOn: "2026-10-18" });
  });

  it("gives up on text it can't read", () => {
    expect(parseQuickDate("soonish", TODAY)).toEqual({ ok: false });
    expect(parseQuickDate("", TODAY)).toEqual({ ok: false });
    expect(parseQuickDate("   ", TODAY)).toEqual({ ok: false });
  });
});
