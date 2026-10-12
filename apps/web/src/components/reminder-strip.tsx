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
  const overdue = waiting.filter((reminder) => reminder.status === "overdue").length;
  const due = waiting.length - overdue;

  return (
    <section
      aria-label="Reminders"
      className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas-soft/50 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-heading-sm text-ink">Reminders</h2>
        <Link className="text-caption text-ink-mute hover:text-ink" to="/app/reminders">
          {waiting.length === 0 ? "See what's coming" : "See everything"}
        </Link>
      </div>

      {waiting.length === 0 ? (
        <p className="text-caption text-ink-mute">
          Nothing is waiting. See what's coming up, and who has a birthday this week.
        </p>
      ) : (
        <>
          <p className="text-caption tabular-nums text-ink-mute">
            {due > 0 && `${due} due`}
            {due > 0 && overdue > 0 && " · "}
            {overdue > 0 && `${overdue} overdue`}
          </p>
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
        </>
      )}
    </section>
  );
}
