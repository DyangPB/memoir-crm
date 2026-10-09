import { daysSince, type ReminderStatus } from "@memoir/core";

import { formatDay } from "./format";

export function reminderTiming(
  reminder: { status: ReminderStatus; dueOn: string },
  now: Date,
): string {
  switch (reminder.status) {
    case "pending":
      return `Due ${formatDay(reminder.dueOn)}`;
    case "due":
      return "Due today";
    case "overdue": {
      const days = daysSince(new Date(`${reminder.dueOn}T00:00:00.000Z`), now);

      return days === 1 ? "1 day overdue" : `${days} days overdue`;
    }
    case "done":
      return "Done";
  }
}

export function reminderChipClass(status: ReminderStatus): string {
  return status === "overdue" ? "bg-danger-bg text-danger" : "bg-amber-bg text-amber";
}
