import { describe, expect, it } from "vitest";

import { lastInteractionDate, parseInteractionInput } from "../src/interaction";
import { parseNoteInput } from "../src/note";

describe("parseInteractionInput", () => {
  it("normalizes a full interaction", () => {
    const result = parseInteractionInput({
      type: "call",
      occurredOn: " 2026-10-01 ",
      note: "  Caught up over the phone  ",
    });

    expect(result).toEqual({
      ok: true,
      interaction: { type: "call", occurredOn: "2026-10-01", note: "Caught up over the phone" },
    });
  });

  it("accepts every interaction type", () => {
    for (const type of ["call", "meeting", "message", "other"]) {
      expect(parseInteractionInput({ type, occurredOn: "2026-10-01" }).ok).toBe(true);
    }
  });

  it("rejects an unknown type", () => {
    const result = parseInteractionInput({ type: "email", occurredOn: "2026-10-01" });

    expect(result).toEqual({
      ok: false,
      message: "Pick a type: call, meeting, message, or other.",
    });
  });

  it("rejects a missing or impossible date", () => {
    expect(parseInteractionInput({ type: "call" }).ok).toBe(false);
    expect(parseInteractionInput({ type: "call", occurredOn: "2026-02-31" }).ok).toBe(false);
  });

  it("keeps an empty note as null", () => {
    const result = parseInteractionInput({ type: "message", occurredOn: "2026-10-01", note: "  " });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.interaction.note).toBeNull();
    }
  });
});

describe("lastInteractionDate", () => {
  it("is null without interactions", () => {
    expect(lastInteractionDate([])).toBeNull();
  });

  it("picks the most recent day", () => {
    expect(
      lastInteractionDate([
        { occurredOn: "2026-09-30" },
        { occurredOn: "2026-10-06" },
        { occurredOn: "2026-10-01" },
      ]),
    ).toBe("2026-10-06");
  });

  it("compares across month and year boundaries", () => {
    expect(lastInteractionDate([{ occurredOn: "2025-12-31" }, { occurredOn: "2026-01-01" }])).toBe(
      "2026-01-01",
    );
  });
});

describe("parseNoteInput", () => {
  it("normalizes a note body", () => {
    expect(parseNoteInput({ body: "  Gift ideas: a good notebook  " })).toEqual({
      ok: true,
      note: { body: "Gift ideas: a good notebook" },
    });
  });

  it("rejects an empty note", () => {
    expect(parseNoteInput({ body: "   " })).toEqual({
      ok: false,
      message: "Write something in the note first.",
    });
  });

  it("rejects a note over the limit", () => {
    expect(parseNoteInput({ body: "a".repeat(5001) }).ok).toBe(false);
  });
});
