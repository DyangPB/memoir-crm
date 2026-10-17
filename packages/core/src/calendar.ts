import { isIsoDay } from "./contact";
import { addDays, dayMs, weekdayOf } from "./iso-day";
import { occurrenceInYearOf, type ImportantDateWithContact } from "./important-date";

export const calendarViews = ["month", "week", "day", "agenda"] as const;

export type CalendarView = (typeof calendarViews)[number];

export type CalendarItem =
  | {
      kind: "reminder";
      id: string;
      title: string;
      date: string;
      contactId: string;
      contactName: string;
      done: boolean;
    }
  | {
      kind: "important-date";
      id: string;
      label: string;
      date: string;
      contactId: string;
      contactName: string;
      /** The years since the date's own year (a birthday's age); null in that year or before it. */
      yearsOld: number | null;
    }
  | {
      /** An event from one of the user's Google calendars: shown, never edited. */
      kind: "google";
      id: string;
      title: string;
      /** One of the days the event covers; a multi-day event appears once per day. */
      date: string;
      /** The event's own start and end, as Google gave them. */
      start: string;
      end: string;
      calendarId: string;
      meetUrl: string | null;
    };

export type CalendarRange = { from: string; to: string };

export type CalendarRangeParseResult =
  | { ok: true; range: CalendarRange }
  | { ok: false; message: string };

const MS_PER_DAY = 86_400_000;
const AGENDA_DAYS = 30;

/** The longest range the feed will expand, comfortably more than any view asks for. */
const MAX_RANGE_DAYS = 400;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];

  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

/** Every day on a Month grid for "YYYY-MM": whole Sunday-to-Saturday weeks around the month. */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)))).padStart(2, "0")}`;

  return eachDay(addDays(first, -weekdayOf(first)), addDays(last, 6 - weekdayOf(last)));
}

/** The Sunday-to-Saturday week a day sits in. */
export function weekOf(day: string): string[] {
  const start = addDays(day, -weekdayOf(day));

  return eachDay(start, addDays(start, 6));
}

/** The days a view shows around its anchor day, so the feed can be asked for exactly those. */
export function calendarRange(view: CalendarView, anchor: string): CalendarRange {
  switch (view) {
    case "month": {
      const days = monthGrid(anchor.slice(0, 7));

      return { from: days[0] ?? anchor, to: days[days.length - 1] ?? anchor };
    }
    case "week": {
      const days = weekOf(anchor);

      return { from: days[0] ?? anchor, to: days[6] ?? anchor };
    }
    case "day":
      return { from: anchor, to: anchor };
    case "agenda":
      return { from: anchor, to: addDays(anchor, AGENDA_DAYS - 1) };
  }
}

/** The anchor day one step earlier or later; a month clamps to the shorter month's last day. */
export function stepAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  switch (view) {
    case "month": {
      const index = Number(anchor.slice(0, 4)) * 12 + (Number(anchor.slice(5, 7)) - 1) + direction;
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      const day = Math.min(Number(anchor.slice(8, 10)), daysInMonth(year, month));

      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    case "week":
      return addDays(anchor, 7 * direction);
    case "day":
      return addDays(anchor, direction);
    case "agenda":
      return addDays(anchor, AGENDA_DAYS * direction);
  }
}

/** Each yearly Important Date as the occurrences that land inside a range, ends included. */
export function expandImportantDates(
  importantDates: readonly ImportantDateWithContact[],
  from: string,
  to: string,
): Extract<CalendarItem, { kind: "important-date" }>[] {
  const items: Extract<CalendarItem, { kind: "important-date" }>[] = [];

  for (const importantDate of importantDates) {
    for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
      const date = occurrenceInYearOf(importantDate.fallsOn, year);

      if (date >= from && date <= to) {
        const years = year - Number(importantDate.fallsOn.slice(0, 4));

        items.push({
          kind: "important-date",
          id: importantDate.id,
          label: importantDate.name,
          date,
          contactId: importantDate.contactId,
          contactName: importantDate.contactName,
          yearsOld: years > 0 ? years : null,
        });
      }
    }
  }

  return items.sort(
    (left, right) => left.date.localeCompare(right.date) || left.label.localeCompare(right.label),
  );
}

export function calendarItemTitle(item: CalendarItem): string {
  return item.kind === "important-date" ? item.label : item.title;
}

function dayOrder(item: CalendarItem): number {
  switch (item.kind) {
    case "important-date":
      return 0;
    case "reminder":
      return item.done ? 3 : 1;
    case "google":
      return 2;
  }
}

/** Items under the day they fall on: Important Dates, then open Reminders, then done ones. */
export function groupItemsByDay(items: readonly CalendarItem[]): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();

  for (const item of items) {
    const day = grouped.get(item.date);

    if (day === undefined) {
      grouped.set(item.date, [item]);
    } else {
      day.push(item);
    }
  }

  for (const day of grouped.values()) {
    day.sort((left, right) => dayOrder(left) - dayOrder(right) || calendarItemTitle(left).localeCompare(calendarItemTitle(right)));
  }

  return grouped;
}

/** Checks the `from` and `to` days a feed request carries. */
export function parseCalendarRange(from: unknown, to: unknown): CalendarRangeParseResult {
  if (typeof from !== "string" || typeof to !== "string" || !isIsoDay(from) || !isIsoDay(to)) {
    return { ok: false, message: "Send the range as ?from=YYYY-MM-DD&to=YYYY-MM-DD." };
  }

  if (from > to) {
    return { ok: false, message: "The range has to start before it ends." };
  }

  if ((dayMs(to) - dayMs(from)) / MS_PER_DAY >= MAX_RANGE_DAYS) {
    return { ok: false, message: "Ask for a shorter range." };
  }

  return { ok: true, range: { from, to } };
}

/**
 * The days of a range that a Google event covers. An all-day event's end is the day
 * after its last day; a timed event covers the day it starts, and the day it ends
 * when that is later (unless it ends exactly at midnight).
 */
export function googleEventDays(start: string, end: string, from: string, to: string): string[] {
  const first = start.slice(0, 10);
  const allDay = start.length === 10;
  const endDay = end.slice(0, 10);
  const endsAtMidnight = !allDay && end.slice(11, 16) === "00:00" && endDay > first;
  const last = allDay || endsAtMidnight ? addDays(endDay, -1) : endDay;

  const lastDay = last < first ? first : last;

  return eachDay(first > from ? first : from, lastDay < to ? lastDay : to);
}
