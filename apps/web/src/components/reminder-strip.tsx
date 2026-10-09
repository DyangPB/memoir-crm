import type { ReminderWithContact } from "@memoir/core";
import { Link } from "react-router";

import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";

type ReminderStripProps = {
  reminders: ReminderWithContact[];
};

export function ReminderStrip({ reminders }: ReminderStripProps) {
  const now = new Date();
  const waiting = reminders.filter(
    (reminder) => reminder.status === "due" || reminder.status === "overdue",
  );

  if (waiting.length === 0) {
    return null;
  }

  const overdue = waiting.filter((reminder) => reminder.status === "overdue").length;
  const due = waiting.length - overdue;

  return (
    <section
      aria-label="Reminders"
      className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas-soft/50 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-heading-sm text-ink">Reminders</h2>
        <p className="text-caption tabular-nums text-ink-mute">
          {due > 0 && `${due} due`}
          {due > 0 && overdue > 0 && " · "}
          {overdue > 0 && `${overdue} overdue`}
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {waiting.map((reminder) => (
          <li key={reminder.id}>
            <Link
              className={cn(
                "flex flex-col gap-0.5 rounded-full px-3 py-1.5 transition-opacity hover:opacity-80",
                reminderChipClass(reminder.status),
              )}
              to={`/app/contacts/${reminder.contactId}`}
            >
              <span className="text-body-md font-medium">{reminder.body}</span>
              <span className="text-caption tabular-nums opacity-80">
                {reminder.contactName} · {reminderTiming(reminder, now)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
