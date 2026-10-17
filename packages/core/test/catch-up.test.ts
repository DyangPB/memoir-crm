import { describe, expect, it } from "vitest";

import { CATCH_UP_AFTER_DAYS, contactsToCatchUp } from "../src/catch-up";

const NOW = new Date("2026-10-17T09:00:00.000Z");

describe("contactsToCatchUp", () => {
  it("uses a 30 day threshold", () => {
    expect(CATCH_UP_AFTER_DAYS).toBe(30);
  });

  it("lists Contacts last talked to more than 30 days ago, quietest first", () => {
    const result = contactsToCatchUp(
      [
        { id: "david", lastInteractionAt: "2026-09-05" },
        { id: "sophia", lastInteractionAt: "2026-08-10" },
        { id: "james", lastInteractionAt: "2026-09-12" },
      ],
      NOW,
    );

    expect(result).toEqual([
      { id: "sophia", lastInteractionAt: "2026-08-10", daysSince: 68 },
      { id: "david", lastInteractionAt: "2026-09-05", daysSince: 42 },
      { id: "james", lastInteractionAt: "2026-09-12", daysSince: 35 },
    ]);
  });

  it("leaves out a Contact on exactly the 30th day", () => {
    const result = contactsToCatchUp(
      [
        { id: "edge", lastInteractionAt: "2026-09-17" },
        { id: "past", lastInteractionAt: "2026-09-16" },
      ],
      NOW,
    );

    expect(result.map((contact) => contact.id)).toEqual(["past"]);
  });

  it("leaves out Contacts with no Interactions yet", () => {
    expect(contactsToCatchUp([{ id: "new", lastInteractionAt: null }], NOW)).toEqual([]);
  });

  it("is empty when everyone is recent", () => {
    expect(contactsToCatchUp([{ id: "close", lastInteractionAt: "2026-10-10" }], NOW)).toEqual([]);
  });
});
