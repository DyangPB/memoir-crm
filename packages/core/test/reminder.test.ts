import { describe, expect, it } from "vitest";

import { nextReminderEvent, parseReminderInput, reminderStatusAt } from "../src/reminder";

describe("parseReminderInput", () => {
  it("accepts a prompt and a due date", () => {
    expect(parseReminderInput({ body: "Call Bob", dueOn: "2026-10-20" })).toEqual({
      ok: true,
      reminder: { body: "Call Bob", dueOn: "2026-10-20" },
    });
  });

  it("trims the prompt", () => {
    expect(parseReminderInput({ body: "  Call Bob  ", dueOn: "2026-10-20" })).toEqual({
      ok: true,
      reminder: { body: "Call Bob", dueOn: "2026-10-20" },
    });
  });

  it("rejects a blank prompt", () => {
    expect(parseReminderInput({ body: "   ", dueOn: "2026-10-20" })).toEqual({
      ok: false,
      message: "Write the reminder first.",
    });
  });

  it("rejects a prompt that is too long", () => {
    expect(parseReminderInput({ body: "x".repeat(201), dueOn: "2026-10-20" })).toEqual({
      ok: false,
      message: "That reminder is too long. Keep it under 200 characters.",
    });
  });

  it("rejects an impossible or missing date", () => {
    expect(parseReminderInput({ body: "Call Bob", dueOn: "2026-02-31" })).toEqual({
      ok: false,
      message: "Reminders need a real date.",
    });
    expect(parseReminderInput({ body: "Call Bob" })).toEqual({
      ok: false,
      message: "Reminders need a real date.",
    });
  });

  it("rejects a payload that isn't JSON", () => {
    expect(parseReminderInput(null)).toEqual({ ok: false, message: "Send the reminder as JSON." });
  });
});

describe("reminderStatusAt", () => {
  it("is pending before the due day begins", () => {
    expect(
      reminderStatusAt({ status: "pending", dueOn: "2026-10-20" }, new Date("2026-10-19T23:59:59.999Z")),
    ).toBe("pending");
  });

  it("is due through the whole due day", () => {
    expect(
      reminderStatusAt({ status: "pending", dueOn: "2026-10-20" }, new Date("2026-10-20T00:00:00.000Z")),
    ).toBe("due");
    expect(
      reminderStatusAt({ status: "pending", dueOn: "2026-10-20" }, new Date("2026-10-20T23:59:59.999Z")),
    ).toBe("due");
  });

  it("is overdue after the due day", () => {
    expect(
      reminderStatusAt({ status: "due", dueOn: "2026-10-20" }, new Date("2026-10-21T00:00:00.000Z")),
    ).toBe("overdue");
  });

  it("stays done once ticked off", () => {
    expect(
      reminderStatusAt({ status: "done", dueOn: "2026-10-20" }, new Date("2026-10-25T12:00:00.000Z")),
    ).toBe("done");
  });
});

describe("nextReminderEvent", () => {
  it("points at the start of the due day while a reminder is pending", () => {
    expect(nextReminderEvent([{ status: "pending", dueOn: "2026-10-20" }])).toEqual(
      new Date("2026-10-20T00:00:00.000Z"),
    );
  });

  it("points at the day after once a reminder is due", () => {
    expect(nextReminderEvent([{ status: "due", dueOn: "2026-10-20" }])).toEqual(
      new Date("2026-10-21T00:00:00.000Z"),
    );
  });

  it("ignores reminders that are overdue or done", () => {
    expect(
      nextReminderEvent([
        { status: "overdue", dueOn: "2026-10-18" },
        { status: "done", dueOn: "2026-10-25" },
      ]),
    ).toBeNull();
  });

  it("takes the earliest event across reminders", () => {
    expect(
      nextReminderEvent([
        { status: "pending", dueOn: "2026-11-01" },
        { status: "due", dueOn: "2026-10-20" },
        { status: "pending", dueOn: "2026-10-22" },
      ]),
    ).toEqual(new Date("2026-10-21T00:00:00.000Z"));
  });

  it("returns a past event so a stale reminder still gets reconciled", () => {
    expect(nextReminderEvent([{ status: "pending", dueOn: "2026-10-18" }])).toEqual(
      new Date("2026-10-18T00:00:00.000Z"),
    );
  });

  it("returns null when nothing is scheduled", () => {
    expect(nextReminderEvent([])).toBeNull();
  });
});
