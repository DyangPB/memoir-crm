import type { CalendarItem, CalendarRange, CalendarView } from "@memoir/core";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const weekdayHeadings = WEEKDAYS.map((name) => name.slice(0, 3));

function weekdayName(isoDay: string): string {
  return WEEKDAYS[new Date(`${isoDay}T00:00:00.000Z`).getUTCDay()] ?? "";
}

function monthName(isoDay: string): string {
  return MONTHS[Number(isoDay.slice(5, 7)) - 1] ?? "";
}

export function dayNumber(isoDay: string): number {
  return Number(isoDay.slice(8, 10));
}

/** "Thursday 22 October 2026". */
export function dayLabel(isoDay: string): string {
  return `${weekdayName(isoDay)} ${dayNumber(isoDay)} ${monthName(isoDay)} ${isoDay.slice(0, 4)}`;
}

/** "October 2026". */
export function monthTitle(isoDay: string): string {
  return `${monthName(isoDay)} ${isoDay.slice(0, 4)}`;
}

function shortDay(isoDay: string): string {
  return `${dayNumber(isoDay)} ${monthName(isoDay).slice(0, 3)}`;
}

/** The heading over a view: the month, the week's span, the day, or the agenda's span. */
export function rangeTitle(view: CalendarView, anchor: string, range: CalendarRange): string {
  switch (view) {
    case "month":
      return monthTitle(anchor);
    case "week":
      return `${shortDay(range.from)} to ${shortDay(range.to)} ${range.to.slice(0, 4)}`;
    case "day":
      return dayLabel(anchor);
    case "agenda":
      return `${shortDay(range.from)} to ${shortDay(range.to)}`;
  }
}

export const viewLabels: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
};

/** How an item's chip looks: Important Dates amber, Reminders ocean, overdue ones red, done ones faded. */
export function itemChipClass(item: CalendarItem, today: string): string {
  if (item.kind === "important-date") {
    return "bg-amber-bg text-amber";
  }

  if (item.done) {
    return "bg-canvas-soft text-ink-mute line-through";
  }

  return item.date < today ? "bg-danger-bg text-danger" : "bg-primary-bg-subdued text-primary";
}
