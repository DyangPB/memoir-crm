import type { ReminderWithContact } from "@memoir/core";
import { useId, useState } from "react";
import { Link } from "react-router";

import { formatDay } from "../lib/format";
import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";
import { Icon } from "./icon";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type ReminderRowProps = {
  reminder: ReminderWithContact;
  now: Date;
  busy: boolean;
  onTick: () => void;
  /** Resolves to whether the new date was saved. */
  onReschedule: (dueOn: string) => Promise<boolean>;
};

export function ReminderRow({ reminder, now, busy, onTick, onReschedule }: ReminderRowProps) {
  const id = useId();
  const [rescheduling, setRescheduling] = useState(false);
  const [dueOn, setDueOn] = useState(reminder.dueOn);
  const done = reminder.status === "done";

  async function handleSave() {
    if (await onReschedule(dueOn)) {
      setRescheduling(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-hairline bg-canvas p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <button
          aria-label={done ? "Done" : `Mark done: ${reminder.body}`}
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            done
              ? "border-primary-container bg-primary-container text-on-primary"
              : "border-hairline-input bg-canvas text-transparent hover:border-primary-container hover:text-ink-mute",
          )}
          disabled={done || busy}
          onClick={onTick}
          type="button"
        >
          <Icon className="text-body-sm font-bold leading-none" name="check" />
        </button>
        <Link className="flex min-w-0 flex-col gap-1.5" to={`/app/contacts/${reminder.contactId}`}>
          <span className={cn("truncate text-body-md text-ink", done && "line-through opacity-60")}>
            {reminder.body}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-1 text-micro-cap uppercase tabular-nums",
                done ? "bg-canvas-soft text-ink-mute" : reminderChipClass(reminder.status),
              )}
            >
              {reminderTiming(reminder, now)}
            </span>
            <span className="text-caption tabular-nums text-ink-mute">
              {done ? `Was due ${formatDay(reminder.dueOn)}` : formatDay(reminder.dueOn)}
            </span>
            <span className="text-caption text-ink-mute">{reminder.contactName}</span>
          </span>
        </Link>
      </div>

      {!done &&
        (rescheduling ? (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`${id}-due`}>
              New date for {reminder.body}
            </label>
            <Input
              className="w-40"
              id={`${id}-due`}
              onChange={(event) => setDueOn(event.target.value)}
              type="date"
              value={dueOn}
            />
            <Button disabled={busy || dueOn === ""} onClick={() => void handleSave()}>
              Save date
            </Button>
            <Button
              onClick={() => {
                setDueOn(reminder.dueOn);
                setRescheduling(false);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button disabled={busy} onClick={onTick} variant="ghost">
              Mark done
            </Button>
            <Button disabled={busy} onClick={() => setRescheduling(true)} variant="secondary">
              <Icon className="text-body-sm" name="schedule" />
              Reschedule
            </Button>
          </div>
        ))}
    </li>
  );
}
