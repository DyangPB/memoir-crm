import { describe, expect, it } from "vitest";

import { fromGoogleEvent, toGoogleEvent, type MirrorItem, type RemoteEvent } from "../src/google-sync";

function reminder(overrides: Partial<MirrorItem> = {}): MirrorItem {
  return {
    kind: "reminder",
    id: "r1",
    title: "Call Bob",
    date: "2026-10-20",
    contactName: "Bob Nguyen",
    updatedAt: 1_000,
    done: false,
    mirror: "full",
    ...overrides,
  };
}

function remote(overrides: Partial<RemoteEvent> = {}): RemoteEvent {
  return {
    id: "evt1",
    cancelled: false,
    summary: "Call Bob",
    startDate: "2026-10-20",
    updated: 2_000,
    ...overrides,
  };
}

describe("toGoogleEvent", () => {
  it("makes a Reminder an all-day event on its due day", () => {
    expect(toGoogleEvent(reminder())).toEqual({
      summary: "Call Bob",
      description: "Reminder for Bob Nguyen, from Memoir.",
      start: { date: "2026-10-20" },
      end: { date: "2026-10-21" },
      extendedProperties: { private: { memoirKind: "reminder", memoirId: "r1" } },
    });
  });

  it("ends the event on the first of the next month, and the next year", () => {
    expect(toGoogleEvent(reminder({ date: "2026-10-31" })).end).toEqual({ date: "2026-11-01" });
    expect(toGoogleEvent(reminder({ date: "2026-12-31" })).end).toEqual({ date: "2027-01-01" });
    expect(toGoogleEvent(reminder({ date: "2028-02-29" })).end).toEqual({ date: "2028-03-01" });
  });

  it("makes an Important Date a yearly all-day event named for its Contact", () => {
    expect(
      toGoogleEvent({
        kind: "important-date",
        id: "d1",
        title: "Anniversary",
        date: "2015-06-10",
        contactName: "Ada Lovelace",
        updatedAt: 1_000,
        done: false,
        mirror: "full",
      }),
    ).toEqual({
      summary: "Anniversary (Ada Lovelace)",
      description: "Important Date for Ada Lovelace, from Memoir.",
      start: { date: "2015-06-10" },
      end: { date: "2015-06-11" },
      recurrence: ["RRULE:FREQ=YEARLY"],
      extendedProperties: { private: { memoirKind: "important-date", memoirId: "d1" } },
    });
  });
});

describe("fromGoogleEvent", () => {
  it("reads a Reminder's text and day back from its event", () => {
    expect(fromGoogleEvent(remote({ summary: "  Call Bob back  ", startDate: "2026-10-22" }), "reminder", "Bob Nguyen")).toEqual({
      title: "Call Bob back",
      date: "2026-10-22",
    });
  });

  it("takes the Contact's name off an Important Date's title", () => {
    expect(
      fromGoogleEvent(remote({ summary: "Wedding day (Ada Lovelace)" }), "important-date", "Ada Lovelace"),
    ).toMatchObject({ title: "Wedding day" });
  });

  it("keeps an Important Date's whole title when it doesn't carry the Contact's name", () => {
    expect(fromGoogleEvent(remote({ summary: "Wedding day" }), "important-date", "Ada Lovelace")).toMatchObject({
      title: "Wedding day",
    });
    expect(
      fromGoogleEvent(remote({ summary: "Wedding day (Someone Else)" }), "important-date", "Ada Lovelace"),
    ).toMatchObject({ title: "Wedding day (Someone Else)" });
  });

  it("has nothing to read from an event with no title or no day", () => {
    expect(fromGoogleEvent(remote({ summary: "   " }), "reminder", "Bob")).toBeNull();
    expect(fromGoogleEvent(remote({ startDate: null }), "reminder", "Bob")).toBeNull();
  });

  it("round-trips what it wrote", () => {
    const item = reminder({ title: "Send a card to Mum" });
    const draft = toGoogleEvent(item);

    expect(
      fromGoogleEvent(remote({ summary: draft.summary, startDate: draft.start.date }), "reminder", item.contactName),
    ).toEqual({ title: item.title, date: item.date });
  });
});
