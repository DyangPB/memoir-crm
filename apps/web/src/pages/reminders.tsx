import {
  importantDateYears,
  nextOccurrence,
  occursWithinDays,
  type ImportantDateWithContact,
  type ReminderWithContact,
} from "@memoir/core";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { ImportantDateMarker } from "../components/important-date-marker";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { listImportantDates, listOpenReminders, tickReminder } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { BIRTHDAY_WINDOW_DAYS } from "../lib/important-dates";
import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";

type UpcomingItem =
  | { key: string; when: string; reminder: ReminderWithContact }
  | { key: string; when: string; importantDate: ImportantDateWithContact };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-heading-lg text-ink">{title}</h2>
      <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
        {children}
      </ul>
    </section>
  );
}

function ReminderRow({
  reminder,
  now,
  ticking,
  onTick,
}: {
  reminder: ReminderWithContact;
  now: Date;
  ticking: boolean;
  onTick: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <Link
        className="flex min-w-0 flex-1 flex-col gap-1.5"
        to={`/app/contacts/${reminder.contactId}`}
      >
        <span className="truncate text-body-md text-ink">{reminder.body}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-micro-cap uppercase tabular-nums",
              reminderChipClass(reminder.status),
            )}
          >
            {reminderTiming(reminder, now)}
          </span>
          <span className="text-caption text-ink-mute">{reminder.contactName}</span>
        </span>
      </Link>
      <Button onClick={onTick} variant="ghost">
        {ticking ? "Ticking off" : "Tick off"}
      </Button>
    </li>
  );
}

function ImportantDateRow({
  importantDate,
  now,
}: {
  importantDate: ImportantDateWithContact;
  now: Date;
}) {
  const years = importantDateYears(importantDate.fallsOn, now);

  return (
    <li>
      <Link
        className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-primary-bg-subdued"
        to={`/app/contacts/${importantDate.contactId}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-body-md text-ink">{importantDate.name}</span>
          <span className="flex flex-wrap items-center gap-2">
            <ImportantDateMarker fallsOn={importantDate.fallsOn} now={now} />
            <span className="text-caption text-ink-mute">{importantDate.contactName}</span>
          </span>
        </span>
        {years > 0 && (
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="font-display text-display-md tabular-nums text-ink">{years}</span>
            <span className="text-caption text-ink-mute">
              {importantDate.source === "birthday" ? "turning" : "years"}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

export function RemindersPage() {
  const { data: session, isPending } = authClient.useSession();
  const [reminders, setReminders] = useState<ReminderWithContact[] | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDateWithContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickingId, setTickingId] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void Promise.all([listOpenReminders(), listImportantDates()]).then(
      ([reminderResult, dateResult]) => {
        if (!active) {
          return;
        }

        if (!reminderResult.ok) {
          setError(reminderResult.message);

          return;
        }

        if (!dateResult.ok) {
          setError(dateResult.message);

          return;
        }

        setReminders(reminderResult.value);
        setImportantDates(dateResult.value);
      },
    );

    return () => {
      active = false;
    };
  }, [session]);

  async function handleTick(reminder: ReminderWithContact) {
    setTickingId(reminder.id);
    const result = await tickReminder(reminder.contactId, reminder.id);
    setTickingId(null);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setError(null);
    setReminders((current) => current?.filter((item) => item.id !== reminder.id) ?? current);
  }

  const now = new Date();

  if (isPending) {
    return <PageLoading label="Fetching what's waiting" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  if (reminders === null || importantDates === null) {
    if (error === null) {
      return <PageLoading label="Fetching what's waiting" />;
    }

    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader email={session.user.email} />
        <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-12">
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
          <Button asChild variant="ghost">
            <Link to="/app">Back to your people</Link>
          </Button>
        </main>
      </div>
    );
  }

  const overdue = reminders.filter((reminder) => reminder.status === "overdue");
  const due = reminders.filter((reminder) => reminder.status === "due");
  const birthdays = importantDates.filter(
    (importantDate) =>
      importantDate.source === "birthday" &&
      occursWithinDays(importantDate.fallsOn, now, BIRTHDAY_WINDOW_DAYS),
  );
  const shownAsBirthday = new Set(birthdays.map((importantDate) => importantDate.id));
  const upcoming: UpcomingItem[] = [
    ...reminders
      .filter((reminder) => reminder.status === "pending")
      .map((reminder) => ({ key: reminder.id, when: reminder.dueOn, reminder })),
    ...importantDates
      .filter((importantDate) => !shownAsBirthday.has(importantDate.id))
      .map((importantDate) => ({
        key: importantDate.id,
        when: nextOccurrence(importantDate.fallsOn, now),
        importantDate,
      })),
  ].sort((left, right) => left.when.localeCompare(right.when));

  const waiting = overdue.length + due.length + birthdays.length + upcoming.length;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-display-md text-ink">What's waiting</h1>
          <Button asChild variant="ghost">
            <Link to="/app">Back to your people</Link>
          </Button>
        </div>

        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        {waiting === 0 ? (
          <p className="text-body-md text-ink-secondary">
            Nothing is waiting. Add a reminder or an important date to a contact, and it will show
            up here.
          </p>
        ) : (
          <>
            {overdue.length > 0 && (
              <Section title="Overdue">
                {overdue.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    now={now}
                    onTick={() => void handleTick(reminder)}
                    reminder={reminder}
                    ticking={tickingId === reminder.id}
                  />
                ))}
              </Section>
            )}

            {due.length > 0 && (
              <Section title="Due">
                {due.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    now={now}
                    onTick={() => void handleTick(reminder)}
                    reminder={reminder}
                    ticking={tickingId === reminder.id}
                  />
                ))}
              </Section>
            )}

            {upcoming.length > 0 && (
              <Section title="Upcoming">
                {upcoming.map((item) =>
                  "reminder" in item ? (
                    <ReminderRow
                      key={item.key}
                      now={now}
                      onTick={() => void handleTick(item.reminder)}
                      reminder={item.reminder}
                      ticking={tickingId === item.reminder.id}
                    />
                  ) : (
                    <ImportantDateRow importantDate={item.importantDate} key={item.key} now={now} />
                  ),
                )}
              </Section>
            )}

            {birthdays.length > 0 && (
              <Section title="Birthdays this week">
                {birthdays.map((importantDate) => (
                  <ImportantDateRow importantDate={importantDate} key={importantDate.id} now={now} />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
