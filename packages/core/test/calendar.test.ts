import { describe, expect, it } from "vitest";

import {
  calendarItemTitle,
  calendarRange,
  expandImportantDates,
  googleEventDays,
  groupItemsByDay,
  monthGrid,
  stepAnchor,
  weekOf,
  type CalendarItem,
} from "../src/calendar";

// 2026-10-17 is a Saturday; weeks start on Sunday.

describe("monthGrid", () => {
  it("fills whole Sunday-to-Saturday weeks around the month", () => {
    const days = monthGrid("2026-10");

    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2026-09-27");
    expect(days[4]).toBe("2026-10-01");
    expect(days[34]).toBe("2026-10-31");
  });

  it("is exactly four rows when the month starts on a Sunday and has 28 days", () => {
    const days = monthGrid("2026-02");

    expect(days).toHaveLength(28);
    expect(days[0]).toBe("2026-02-01");
    expect(days[27]).toBe("2026-02-28");
  });

  it("grows to six rows when the month needs them", () => {
    const days = monthGrid("2026-08");

    expect(days).toHaveLength(42);
    expect(days[0]).toBe("2026-07-26");
    expect(days[41]).toBe("2026-09-05");
  });

  it("counts a leap February", () => {
    expect(monthGrid("2028-02").filter((day) => day.startsWith("2028-02"))).toHaveLength(29);
  });
});

describe("weekOf", () => {
  it("runs Sunday to Saturday around a day", () => {
    expect(weekOf("2026-10-17")).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
  });

  it("starts on the day itself when it is a Sunday", () => {
    expect(weekOf("2026-10-18")[0]).toBe("2026-10-18");
    expect(weekOf("2026-10-18")[6]).toBe("2026-10-24");
  });
});

describe("calendarRange", () => {
  it("covers the whole month grid for Month", () => {
    expect(calendarRange("month", "2026-10-17")).toEqual({ from: "2026-09-27", to: "2026-10-31" });
  });

  it("covers the week for Week, and the day for Day", () => {
    expect(calendarRange("week", "2026-10-17")).toEqual({ from: "2026-10-11", to: "2026-10-17" });
    expect(calendarRange("day", "2026-10-17")).toEqual({ from: "2026-10-17", to: "2026-10-17" });
  });

  it("looks thirty days ahead, today included, for Agenda", () => {
    expect(calendarRange("agenda", "2026-10-17")).toEqual({ from: "2026-10-17", to: "2026-11-15" });
  });
});

describe("stepAnchor", () => {
  it("moves a month at a time for Month, clamping to a shorter month", () => {
    expect(stepAnchor("month", "2026-10-17", 1)).toBe("2026-11-17");
    expect(stepAnchor("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(stepAnchor("month", "2026-03-31", -1)).toBe("2026-02-28");
    expect(stepAnchor("month", "2026-12-15", 1)).toBe("2027-01-15");
    expect(stepAnchor("month", "2026-01-15", -1)).toBe("2025-12-15");
  });

  it("moves a week, a day, or thirty days for the other views", () => {
    expect(stepAnchor("week", "2026-10-17", 1)).toBe("2026-10-24");
    expect(stepAnchor("day", "2026-10-17", -1)).toBe("2026-10-16");
    expect(stepAnchor("agenda", "2026-10-17", 1)).toBe("2026-11-16");
  });
});

function importantDate(id: string, fallsOn: string, name = "Birthday") {
  return {
    id,
    contactId: "bob",
    contactName: "Bob",
    name,
    fallsOn,
    source: "birthday" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("expandImportantDates", () => {
  it("places a yearly date on its day in the range, with the years it marks", () => {
    expect(
      expandImportantDates([importantDate("d1", "1992-10-23")], "2026-10-01", "2026-10-31"),
    ).toEqual([
      {
        kind: "important-date",
        id: "d1",
        label: "Birthday",
        date: "2026-10-23",
        contactId: "bob",
        contactName: "Bob",
        yearsOld: 34,
      },
    ]);
  });

  it("leaves out a date that doesn't land in the range, ends included", () => {
    const dates = [importantDate("d1", "1992-10-23")];

    expect(expandImportantDates(dates, "2026-10-01", "2026-10-22")).toEqual([]);
    expect(expandImportantDates(dates, "2026-10-23", "2026-10-23")).toHaveLength(1);
    expect(expandImportantDates(dates, "2026-10-24", "2026-12-31")).toEqual([]);
  });

  it("finds the date in the new year when the range crosses year end", () => {
    const [item] = expandImportantDates(
      [importantDate("d1", "1990-01-05")],
      "2026-12-20",
      "2027-01-10",
    );

    expect(item).toMatchObject({ date: "2027-01-05", yearsOld: 37 });
  });

  it("repeats a date once per year in a range longer than a year", () => {
    const items = expandImportantDates(
      [importantDate("d1", "1990-06-01")],
      "2026-05-01",
      "2027-07-01",
    );

    expect(items.map((item) => item.date)).toEqual(["2026-06-01", "2027-06-01"]);
  });

  it("lands 29 February on the 28th in a common year", () => {
    const [common] = expandImportantDates([importantDate("d1", "2000-02-29")], "2027-02-01", "2027-02-28");
    const [leap] = expandImportantDates([importantDate("d1", "2000-02-29")], "2028-02-01", "2028-02-29");

    expect(common).toMatchObject({ date: "2027-02-28", yearsOld: 27 });
    expect(leap).toMatchObject({ date: "2028-02-29", yearsOld: 28 });
  });

  it("has no years to report for a date that starts in the future", () => {
    const [item] = expandImportantDates([importantDate("d1", "2030-10-23")], "2026-10-01", "2026-10-31");

    expect(item).toMatchObject({ date: "2026-10-23", yearsOld: null });
  });
});

function reminder(id: string, title: string, date: string, done = false): CalendarItem {
  return { kind: "reminder", id, title, date, contactId: "bob", contactName: "Bob", done };
}

describe("groupItemsByDay", () => {
  it("collects items under their day", () => {
    const grouped = groupItemsByDay([
      reminder("r1", "Call Bob", "2026-10-17"),
      reminder("r2", "Send a card", "2026-10-18"),
      reminder("r3", "Write", "2026-10-17"),
    ]);

    expect([...grouped.keys()].sort()).toEqual(["2026-10-17", "2026-10-18"]);
    expect(grouped.get("2026-10-17")).toHaveLength(2);
  });

  it("lists Important Dates first, then open Reminders by title, then done ones", () => {
    const grouped = groupItemsByDay([
      reminder("r1", "Zebra", "2026-10-17"),
      reminder("r2", "Done thing", "2026-10-17", true),
      reminder("r3", "Apple", "2026-10-17"),
      ...expandImportantDates([importantDate("d1", "1992-10-17")], "2026-10-17", "2026-10-17"),
    ]);

    expect(
      grouped.get("2026-10-17")?.map(calendarItemTitle),
    ).toEqual(["Birthday", "Apple", "Zebra", "Done thing"]);
  });
});

describe("groupItemsByDay with Google events", () => {
  it("lists Google events after open Reminders and before done ones", () => {
    const grouped = groupItemsByDay([
      reminder("r1", "Done thing", "2026-10-17", true),
      {
        kind: "google",
        id: "g1",
        title: "Dinner",
        date: "2026-10-17",
        start: "2026-10-17",
        end: "2026-10-18",
        calendarId: "primary",
        meetUrl: null,
      },
      reminder("r2", "Call Bob", "2026-10-17"),
    ]);

    expect(grouped.get("2026-10-17")?.map(calendarItemTitle)).toEqual(["Call Bob", "Dinner", "Done thing"]);
  });
});

describe("googleEventDays", () => {
  it("is just the one day for a single-day all-day event", () => {
    expect(googleEventDays("2026-10-20", "2026-10-21", "2026-10-01", "2026-10-31")).toEqual(["2026-10-20"]);
  });

  it("covers every day of a multi-day all-day event, the end day being exclusive", () => {
    expect(googleEventDays("2026-10-20", "2026-10-23", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
    ]);
  });

  it("keeps only the days inside the range, including an event that began before it", () => {
    expect(googleEventDays("2026-09-29", "2026-10-03", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(googleEventDays("2026-10-30", "2026-11-03", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-30",
      "2026-10-31",
    ]);
  });

  it("puts a timed event on the day it starts, and on the day it ends if that is later", () => {
    expect(googleEventDays("2026-10-20T10:00:00+01:00", "2026-10-20T11:00:00+01:00", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-20",
    ]);
    expect(googleEventDays("2026-10-20T22:00:00+01:00", "2026-10-21T02:00:00+01:00", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-20",
      "2026-10-21",
    ]);
  });

  it("doesn't spill a timed event ending exactly at midnight onto the next day", () => {
    expect(googleEventDays("2026-10-20T20:00:00+01:00", "2026-10-21T00:00:00+01:00", "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-20",
    ]);
  });

  it("is empty when the event is outside the range", () => {
    expect(googleEventDays("2026-11-05", "2026-11-06", "2026-10-01", "2026-10-31")).toEqual([]);
  });
});
