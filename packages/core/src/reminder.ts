import { isIsoDay } from "./contact";

const reminderStatuses = ["pending", "due", "overdue", "done"] as const;

export type ReminderStatus = (typeof reminderStatuses)[number];

export type ReminderInput = {
  body: string;
  dueOn: string;
};

export type Reminder = ReminderInput & {
  id: string;
  contactId: string;
  status: ReminderStatus;
  createdAt: string;
};

export type ReminderWithContact = Reminder & {
  contactName: string;
};

export type ReminderParseResult =
  | { ok: true; reminder: ReminderInput }
  | { ok: false; message: string };

const BODY_MAX_LENGTH = 200;

export function parseReminderInput(input: unknown): ReminderParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the reminder as JSON." };
  }

  const record = input as Record<string, unknown>;
  const body = typeof record.body === "string" ? record.body.trim() : "";

  if (body === "") {
    return { ok: false, message: "Write the reminder first." };
  }

  if (body.length > BODY_MAX_LENGTH) {
    return { ok: false, message: "That reminder is too long. Keep it under 200 characters." };
  }

  const dueOn = typeof record.dueOn === "string" ? record.dueOn.trim() : "";

  if (!isIsoDay(dueOn)) {
    return { ok: false, message: "Reminders need a real date." };
  }

  return { ok: true, reminder: { body, dueOn } };
}

const MS_PER_DAY = 86_400_000;

function startOfDueDay(dueOn: string): number {
  return Date.parse(`${dueOn}T00:00:00.000Z`);
}

/**
 * The status a Reminder carries at a given moment: pending until its due day
 * begins, due through that day, overdue after it. A ticked-off Reminder stays done.
 */
export function reminderStatusAt(
  reminder: { status: ReminderStatus; dueOn: string },
  now: Date,
): ReminderStatus {
  if (reminder.status === "done") {
    return "done";
  }

  const dueStart = startOfDueDay(reminder.dueOn);

  if (now.getTime() < dueStart) {
    return "pending";
  }

  if (now.getTime() < dueStart + MS_PER_DAY) {
    return "due";
  }

  return "overdue";
}

/**
 * The next moment any of these Reminders changes status, driving the reminder
 * engine's single alarm. Past moments are returned so a stale Reminder still
 * gets reconciled. Returns null when nothing is scheduled.
 */
export function nextReminderEvent(
  reminders: readonly { status: ReminderStatus; dueOn: string }[],
): Date | null {
  let next: number | null = null;

  for (const reminder of reminders) {
    if (reminder.status === "done" || reminder.status === "overdue") {
      continue;
    }

    const at =
      reminder.status === "pending"
        ? startOfDueDay(reminder.dueOn)
        : startOfDueDay(reminder.dueOn) + MS_PER_DAY;

    if (next === null || at < next) {
      next = at;
    }
  }

  return next === null ? null : new Date(next);
}
