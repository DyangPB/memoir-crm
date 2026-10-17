import { describe, expect, it } from "vitest";

import { planSync, type MirrorItem, type RemoteEvent, type SyncLink } from "../src/google-sync";

function item(overrides: Partial<MirrorItem> = {}): MirrorItem {
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

function link(overrides: Partial<SyncLink> = {}): SyncLink {
  return {
    kind: "reminder",
    itemId: "r1",
    eventId: "evt1",
    title: "Call Bob",
    date: "2026-10-20",
    remoteUpdated: 5_000,
    ...overrides,
  };
}

function event(overrides: Partial<RemoteEvent> = {}): RemoteEvent {
  return {
    id: "evt1",
    cancelled: false,
    summary: "Call Bob",
    startDate: "2026-10-20",
    updated: 5_000,
    ...overrides,
  };
}

function plan(input: {
  local?: MirrorItem[];
  links?: SyncLink[];
  remote?: RemoteEvent[];
  fullListing?: boolean;
}) {
  return planSync({
    local: input.local ?? [],
    links: input.links ?? [],
    remote: input.remote ?? [],
    fullListing: input.fullListing ?? false,
  });
}

describe("pushing Memoir to Google", () => {
  it("creates an event for an item that has none", () => {
    expect(plan({ local: [item()] })).toEqual([{ type: "create-event", item: item() }]);
  });

  it("creates an event for an Important Date", () => {
    const date = item({ kind: "important-date", id: "d1", title: "Anniversary" });

    expect(plan({ local: [date] })).toEqual([{ type: "create-event", item: date }]);
  });

  it("gives a ticked-off Reminder no event", () => {
    expect(plan({ local: [item({ done: true })] })).toEqual([]);
  });

  it("removes the event when a linked Reminder is ticked off", () => {
    expect(plan({ local: [item({ done: true })], links: [link()] })).toEqual([
      { type: "delete-event", eventId: "evt1" },
    ]);
  });

  it("updates the event when the item changed in Memoir", () => {
    const changed = item({ title: "Call Bob back", updatedAt: 2_000 });

    expect(plan({ local: [changed], links: [link()] })).toEqual([
      { type: "update-event", item: changed, eventId: "evt1" },
    ]);
  });

  it("updates the event when the day changed in Memoir", () => {
    const moved = item({ date: "2026-10-25", updatedAt: 2_000 });

    expect(plan({ local: [moved], links: [link()] })).toEqual([
      { type: "update-event", item: moved, eventId: "evt1" },
    ]);
  });

  it("doesn't touch Google when only Memoir's own bookkeeping changed", () => {
    expect(plan({ local: [item({ updatedAt: 9_000 })], links: [link()] })).toEqual([]);
  });

  it("does nothing when neither side changed", () => {
    expect(plan({ local: [item()], links: [link()] })).toEqual([]);
  });

  it("removes the event of an item that was deleted in Memoir", () => {
    expect(plan({ local: [], links: [link()] })).toEqual([{ type: "delete-event", eventId: "evt1" }]);
  });

  it("only forgets a link when both sides are already gone", () => {
    expect(plan({ local: [], links: [link()], remote: [event({ cancelled: true })] })).toEqual([
      { type: "drop-link", eventId: "evt1" },
    ]);
  });
});

describe("pulling Google into Memoir", () => {
  it("takes a Google edit when Memoir hasn't changed", () => {
    expect(
      plan({
        local: [item()],
        links: [link()],
        remote: [event({ summary: "Call Bob on the landline", startDate: "2026-10-22", updated: 6_000 })],
      }),
    ).toEqual([
      {
        type: "update-local",
        kind: "reminder",
        id: "r1",
        title: "Call Bob on the landline",
        date: "2026-10-22",
        eventId: "evt1",
        remoteUpdated: 6_000,
      },
    ]);
  });

  it("only notes a Google edit that changed nothing Memoir keeps", () => {
    expect(plan({ local: [item()], links: [link()], remote: [event({ updated: 6_000 })] })).toEqual([
      { type: "refresh-link", eventId: "evt1", remoteUpdated: 6_000 },
    ]);
  });

  it("ignores the echo of its own push", () => {
    expect(plan({ local: [item()], links: [link()], remote: [event({ updated: 5_000 })] })).toEqual([]);
  });

  it("deletes the item when its event was deleted in Google", () => {
    expect(plan({ local: [item()], links: [link()], remote: [event({ cancelled: true })] })).toEqual([
      { type: "delete-local", kind: "reminder", id: "r1", eventId: "evt1" },
    ]);
  });

  it("deletes the item when a full listing no longer has its event", () => {
    expect(plan({ local: [item()], links: [link()], remote: [], fullListing: true })).toEqual([
      { type: "delete-local", kind: "reminder", id: "r1", eventId: "evt1" },
    ]);
  });

  it("doesn't read a missing event as deleted when only changes were listed", () => {
    expect(plan({ local: [item()], links: [link()], remote: [], fullListing: false })).toEqual([]);
  });

  it("leaves an unlinked event alone", () => {
    expect(plan({ remote: [event({ id: "stranger" })] })).toEqual([]);
  });

  it("keeps an edit that makes the title empty out of Memoir", () => {
    expect(
      plan({ local: [item()], links: [link()], remote: [event({ summary: "  ", updated: 6_000 })] }),
    ).toEqual([{ type: "refresh-link", eventId: "evt1", remoteUpdated: 6_000 }]);
  });
});

describe("when both sides changed", () => {
  const edited = event({ summary: "From Google", updated: 6_000 });

  it("takes a Google edit even when Memoir's bookkeeping is newer", () => {
    const [action] = plan({ local: [item({ updatedAt: 9_000 })], links: [link()], remote: [edited] });

    expect(action).toMatchObject({ type: "update-local", title: "From Google" });
  });

  it("lets the newer Google edit win", () => {
    const [action] = plan({
      local: [item({ title: "Edited here", updatedAt: 5_500 })],
      links: [link()],
      remote: [edited],
    });

    expect(action).toMatchObject({ type: "update-local", title: "From Google" });
  });

  it("lets the newer Memoir edit win", () => {
    const local = item({ title: "From Memoir", updatedAt: 7_000 });

    expect(plan({ local: [local], links: [link()], remote: [edited] })).toEqual([
      { type: "update-event", item: local, eventId: "evt1" },
    ]);
  });
});

describe("items Google may not change", () => {
  const birthday = item({ kind: "important-date", id: "d1", title: "Birthday", mirror: "push-only" });
  const birthdayLink = link({ kind: "important-date", itemId: "d1" });

  it("puts Memoir's version back over a Google edit", () => {
    expect(
      plan({
        local: [birthday],
        links: [birthdayLink],
        remote: [event({ summary: "Renamed", updated: 6_000 })],
      }),
    ).toEqual([{ type: "update-event", item: birthday, eventId: "evt1" }]);
  });

  it("recreates the event when Google deleted it", () => {
    expect(
      plan({ local: [birthday], links: [birthdayLink], remote: [event({ cancelled: true })] }),
    ).toEqual([
      { type: "drop-link", eventId: "evt1" },
      { type: "create-event", item: birthday },
    ]);
  });
});
