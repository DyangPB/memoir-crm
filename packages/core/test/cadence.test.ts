import { describe, expect, it } from "vitest";

import {
  cadenceHealth,
  contactsToCatchUp,
  effectiveCadenceDays,
  parseCadenceDays,
  parseCadenceInput,
  type CadenceSettings,
} from "../src/cadence";

describe("effectiveCadenceDays", () => {
  it("uses the global default when a Contact has no override", () => {
    expect(effectiveCadenceDays({ cadenceDays: null, cadenceTracked: true }, 30)).toBe(30);
  });

  it("uses the Contact's own override instead of the default", () => {
    expect(effectiveCadenceDays({ cadenceDays: 7, cadenceTracked: true }, 30)).toBe(7);
  });

  it("has no target when the Contact opted out, even with an override", () => {
    expect(effectiveCadenceDays({ cadenceDays: 7, cadenceTracked: false }, 30)).toBeNull();
  });
});

const NOW = new Date("2026-10-17T09:00:00.000Z");

function contact(id: string, lastInteractionAt: string | null, settings: Partial<CadenceSettings> = {}) {
  return { id, lastInteractionAt, cadenceDays: null, cadenceTracked: true, ...settings };
}

describe("contactsToCatchUp", () => {
  it("lists Contacts quiet for longer than the default, quietest first", () => {
    const result = contactsToCatchUp(
      [
        contact("david", "2026-09-05"),
        contact("sophia", "2026-08-10"),
        contact("james", "2026-09-12"),
        contact("edge", "2026-09-17"),
        contact("recent", "2026-10-10"),
      ],
      NOW,
      30,
    );

    expect(result.map((entry) => [entry.id, entry.daysSince])).toEqual([
      ["sophia", 68],
      ["david", 42],
      ["james", 35],
    ]);
  });

  it("judges each Contact against its own Cadence, and skips opt-outs and the never-talked", () => {
    const result = contactsToCatchUp(
      [
        contact("weekly", "2026-10-05", { cadenceDays: 7 }),
        contact("yearly", "2026-06-01", { cadenceDays: 365 }),
        contact("opted-out", "2026-01-01", { cadenceTracked: false }),
        contact("new", null),
      ],
      NOW,
      30,
    );

    expect(result.map((entry) => entry.id)).toEqual(["weekly"]);
  });
});

describe("cadenceHealth", () => {
  it("is the share of tracked Contacts within their target, ignoring opt-outs and the never-talked", () => {
    const health = cadenceHealth(
      [
        contact("a", "2026-10-10"),
        contact("b", "2026-10-01"),
        contact("c", "2026-09-20", { cadenceDays: 60 }),
        contact("d", "2026-08-01"),
        contact("opted-out", "2026-01-01", { cadenceTracked: false }),
        contact("new", null),
      ],
      NOW,
      30,
    );

    expect(health).toEqual({ tracked: 4, inTouch: 3, percent: 75 });
  });

  it("has nothing to report when no Contact can be measured yet", () => {
    expect(cadenceHealth([contact("new", null)], NOW, 30)).toBeNull();
    expect(cadenceHealth([], NOW, 30)).toBeNull();
  });
});

describe("parseCadenceDays", () => {
  it("accepts a whole number of days", () => {
    expect(parseCadenceDays(14)).toEqual({ ok: true, days: 14 });
    expect(parseCadenceDays(1)).toEqual({ ok: true, days: 1 });
    expect(parseCadenceDays(3650)).toEqual({ ok: true, days: 3650 });
  });

  it.each([0, -3, 1.5, 3651, "14", null, Number.NaN])("rejects %s", (value) => {
    const result = parseCadenceDays(value);

    expect(result.ok).toBe(false);
  });
});

describe("parseCadenceInput", () => {
  it("defaults to the global Cadence, tracked", () => {
    expect(parseCadenceInput({})).toEqual({
      ok: true,
      cadence: { cadenceDays: null, cadenceTracked: true },
    });
  });

  it("reads an override and an opt-out", () => {
    expect(parseCadenceInput({ cadenceDays: 7, cadenceTracked: false })).toEqual({
      ok: true,
      cadence: { cadenceDays: 7, cadenceTracked: false },
    });
  });

  it("treats a null override as 'use the default'", () => {
    expect(parseCadenceInput({ cadenceDays: null })).toEqual({
      ok: true,
      cadence: { cadenceDays: null, cadenceTracked: true },
    });
  });

  it("rejects a bad override or a non-boolean opt-out", () => {
    expect(parseCadenceInput({ cadenceDays: 0 }).ok).toBe(false);
    expect(parseCadenceInput({ cadenceTracked: "no" }).ok).toBe(false);
  });
});
