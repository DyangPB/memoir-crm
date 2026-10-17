import { describe, expect, it } from "vitest";

import { importantDatesInTab, importantDateSection, reminderInTab, reminderSection } from "../src/reminder-view";

// 2026-10-17 is a Saturday.
const TODAY = "2026-10-17";

describe("reminderInTab", () => {
  const statuses = ["overdue", "due", "pending", "done"] as const;

  function shown(tab: "all" | "due" | "upcoming" | "completed") {
    return statuses.filter((status) => reminderInTab({ status }, tab));
  }

  it("All shows every open Reminder and hides the done ones", () => {
    expect(shown("all")).toEqual(["overdue", "due", "pending"]);
  });

  it("Due & Overdue shows only what needs the user now", () => {
    expect(shown("due")).toEqual(["overdue", "due"]);
  });

  it("Upcoming shows only Reminders still pending", () => {
    expect(shown("upcoming")).toEqual(["pending"]);
  });

  it("Completed shows only done Reminders", () => {
    expect(shown("completed")).toEqual(["done"]);
  });
});

describe("importantDatesInTab", () => {
  it("shows Important Dates under All and Upcoming only", () => {
    expect(importantDatesInTab("all")).toBe(true);
    expect(importantDatesInTab("upcoming")).toBe(true);
    expect(importantDatesInTab("due")).toBe(false);
    expect(importantDatesInTab("completed")).toBe(false);
  });
});

describe("reminderSection", () => {
  it("puts an overdue Reminder under Overdue", () => {
    expect(reminderSection({ status: "overdue", dueOn: "2026-10-10" }, TODAY)).toBe("overdue");
  });

  it("puts a Reminder due today under this week", () => {
    expect(reminderSection({ status: "due", dueOn: TODAY }, TODAY)).toBe("this-week");
  });

  it("keeps a pending Reminder under this week through the sixth day ahead", () => {
    expect(reminderSection({ status: "pending", dueOn: "2026-10-18" }, TODAY)).toBe("this-week");
    expect(reminderSection({ status: "pending", dueOn: "2026-10-23" }, TODAY)).toBe("this-week");
  });

  it("moves a pending Reminder a week or more away under Upcoming", () => {
    expect(reminderSection({ status: "pending", dueOn: "2026-10-24" }, TODAY)).toBe("upcoming");
    expect(reminderSection({ status: "pending", dueOn: "2027-01-01" }, TODAY)).toBe("upcoming");
  });

  it("puts a done Reminder under Completed", () => {
    expect(reminderSection({ status: "done", dueOn: "2026-10-10" }, TODAY)).toBe("completed");
  });
});

describe("importantDateSection", () => {
  it("puts an Important Date within the week under this week", () => {
    expect(importantDateSection("1990-10-17", TODAY)).toBe("this-week");
    expect(importantDateSection("1990-10-23", TODAY)).toBe("this-week");
  });

  it("puts a later Important Date under Upcoming", () => {
    expect(importantDateSection("1990-10-24", TODAY)).toBe("upcoming");
    expect(importantDateSection("1990-03-02", TODAY)).toBe("upcoming");
  });
});
