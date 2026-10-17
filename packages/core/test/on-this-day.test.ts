import { describe, expect, it } from "vitest";

import { pickOnThisDay } from "../src/on-this-day";

describe("pickOnThisDay", () => {
  it("is null when there are no Interactions", () => {
    expect(pickOnThisDay([], "2026-10-17")).toBeNull();
  });

  it("picks an Interaction from this calendar date in a previous year", () => {
    const picked = pickOnThisDay([{ id: "a", occurredOn: "2024-10-17" }], "2026-10-17");

    expect(picked).toEqual({ id: "a", occurredOn: "2024-10-17", yearsAgo: 2 });
  });

  it("prefers the most recent previous year", () => {
    const picked = pickOnThisDay(
      [
        { id: "old", occurredOn: "2021-10-17" },
        { id: "recent", occurredOn: "2025-10-17" },
        { id: "mid", occurredOn: "2023-10-17" },
      ],
      "2026-10-17",
    );

    expect(picked).toMatchObject({ id: "recent", yearsAgo: 1 });
  });

  it("ignores today's own year, future years, and other dates", () => {
    const picked = pickOnThisDay(
      [
        { id: "today", occurredOn: "2026-10-17" },
        { id: "future", occurredOn: "2027-10-17" },
        { id: "next-day", occurredOn: "2025-10-18" },
        { id: "other-month", occurredOn: "2025-11-17" },
      ],
      "2026-10-17",
    );

    expect(picked).toBeNull();
  });

  it("keeps list order when several Interactions share the picked date", () => {
    const picked = pickOnThisDay(
      [
        { id: "first", occurredOn: "2025-10-17" },
        { id: "second", occurredOn: "2025-10-17" },
      ],
      "2026-10-17",
    );

    expect(picked).toMatchObject({ id: "first" });
  });
});
