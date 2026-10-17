import { occursWithinDays } from "./important-date";
import type { ReminderStatus } from "./reminder";

export const reminderTabs = ["all", "due", "upcoming", "completed"] as const;

export type ReminderTab = (typeof reminderTabs)[number];

export type ReminderSection = "overdue" | "this-week" | "upcoming" | "completed";

const MS_PER_DAY = 86_400_000;

/** How many days past today the "Due today & this week" section reaches. */
const THIS_WEEK_DAYS = 6;

const tabStatuses: Record<ReminderTab, readonly ReminderStatus[]> = {
  all: ["overdue", "due", "pending"],
  due: ["overdue", "due"],
  upcoming: ["pending"],
  completed: ["done"],
};

/** Whether a Reminder belongs under a filter tab on the Reminders page. */
export function reminderInTab(reminder: { status: ReminderStatus }, tab: ReminderTab): boolean {
  return tabStatuses[tab].includes(reminder.status);
}

/** Important Dates sit alongside Reminders under All and Upcoming, and nowhere else. */
export function importantDatesInTab(tab: ReminderTab): boolean {
  return tab === "all" || tab === "upcoming";
}

function daysAhead(dueOn: string, today: string): number {
  return Math.round(
    (Date.parse(`${dueOn}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / MS_PER_DAY,
  );
}

/** The Reminders page section a Reminder is grouped under, given the user's `today`. */
export function reminderSection(
  reminder: { status: ReminderStatus; dueOn: string },
  today: string,
): ReminderSection {
  switch (reminder.status) {
    case "done":
      return "completed";
    case "overdue":
      return "overdue";
    case "due":
      return "this-week";
    case "pending":
      return daysAhead(reminder.dueOn, today) <= THIS_WEEK_DAYS ? "this-week" : "upcoming";
  }
}

/** The section an Important Date is grouped under, by when it next comes round. */
export function importantDateSection(fallsOn: string, today: string): "this-week" | "upcoming" {
  return occursWithinDays(fallsOn, new Date(`${today}T00:00:00.000Z`), THIS_WEEK_DAYS)
    ? "this-week"
    : "upcoming";
}
