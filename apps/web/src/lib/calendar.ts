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

export function itemIcon(item: CalendarItem): string {
  switch (item.kind) {
    case "reminder":
      return "schedule";
    case "important-date":
      return "cake";
    case "google":
      return "event";
  }
}

export function itemKindLabel(item: CalendarItem): string {
  switch (item.kind) {
    case "reminder":
      return item.done ? "Done" : "Reminder";
    case "important-date":
      return "Important Date";
    case "google":
      return "Google Calendar";
  }
}

export type ItemDetails = {
  /** What sort of item it is, as the popup labels it. */
  kind: string;
  /** Whose it is, when it belongs to a Contact. */
  who: string | null;
  when: string;
  /** Where a Reminder stands against today. */
  status: string | null;
  extra: string | null;
};

function daysFromToday(day: string, today: string): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000,
  );
}

function reminderStatus(done: boolean, date: string, today: string): string {
  if (done) {
    return "Done";
  }

  const days = daysFromToday(date, today);

  if (days < 0) {
    return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  }

  if (days === 0) {
    return "Due today";
  }

  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

/** The words a popup shows about an item on the Calendar. */
export function itemDetails(item: CalendarItem, today: string): ItemDetails {
  switch (item.kind) {
    case "reminder":
      return {
        kind: "Reminder",
        who: `For ${item.contactName}`,
        when: dayLabel(item.date),
        status: reminderStatus(item.done, item.date, today),
        extra: null,
      };
    case "important-date":
      return {
        kind: "Important Date",
        who: item.contactName,
        when: dayLabel(item.date),
        status: null,
        extra: item.yearsOld === null ? null : `Marks ${item.yearsOld} ${item.yearsOld === 1 ? "year" : "years"}`,
      };
    case "google":
      return {
        kind: "Google Calendar",
        who: null,
        when: dayLabel(item.date),
        status: null,
        extra: item.start.length > 10 ? `${item.start.slice(11, 16)} to ${item.end.slice(11, 16)}` : null,
      };
  }
}

/** How an item's chip looks: Important Dates amber, Reminders ocean, overdue ones red, done ones faded. */
export function itemChipClass(item: CalendarItem, today: string): string {
  if (item.kind === "important-date") {
    return "bg-amber-bg text-amber";
  }

  if (item.kind === "google") {
    return "border border-hairline bg-canvas-soft text-ink-secondary";
  }

  if (item.done) {
    return "bg-canvas-soft text-ink-mute line-through";
  }

  return item.date < today ? "bg-danger-bg text-danger" : "bg-primary-bg-subdued text-primary";
}
