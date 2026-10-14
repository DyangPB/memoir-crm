import {
  importantDateYears,
  nextOccurrence,
  occursWithinDays,
  UPCOMING_WINDOW_DAYS,
  type Contact,
  type ImportantDateWithContact,
  type ReminderWithContact,
} from "@memoir/core";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { listContacts, listImportantDates, listOpenReminders } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { importantDateTiming } from "../lib/important-dates";
import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";

type DashboardCardProps = {
  title: string;
  linkLabel: string;
  linkTo: string;
  children: ReactNode;
};

function DashboardCard({ title, linkLabel, linkTo, children }: DashboardCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-heading-lg text-ink">{title}</h2>
        <Link className="text-caption text-ink-mute hover:text-ink" to={linkTo}>
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function ReminderChip({ reminder, now }: { reminder: ReminderWithContact; now: Date }) {
  return (
    <li>
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
  );
}

function ComingUpRow({
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
        className="-mx-2 flex items-center justify-between gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-primary-bg-subdued"
        to={`/app/contacts/${importantDate.contactId}`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-amber-fill" />
          <span className="truncate text-body-md text-ink">{importantDate.name}</span>
          <span className="shrink-0 text-caption text-ink-mute">{importantDate.contactName}</span>
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          {importantDate.source === "birthday" && years > 0 && (
            <span className="text-caption text-ink-mute">turning {years}</span>
          )}
          <span className="text-body-tabular tabular-nums text-ink-mute">
            {importantDateTiming(importantDate.fallsOn, now)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function comingUpCountLine(importantDates: ImportantDateWithContact[], now: Date): string {
  const count =
    importantDates.length === 1
      ? "1 birthday or date in the next 30 days"
      : `${importantDates.length} birthdays and dates in the next 30 days`;
  const next = importantDates[0];

  return next === undefined ? count : `${count} · next: ${importantDateTiming(next.fallsOn, now)}`;
}

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [reminders, setReminders] = useState<ReminderWithContact[] | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDateWithContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void Promise.all([listContacts(), listOpenReminders(), listImportantDates()]).then(
      ([contactResult, reminderResult, dateResult]) => {
        if (!active) {
          return;
        }

        if (!contactResult.ok) {
          setError(contactResult.message);

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

        setContacts(contactResult.value);
        setReminders(reminderResult.value);
        setImportantDates(dateResult.value);
      },
    );

    return () => {
      active = false;
    };
  }, [session]);

  const now = new Date();

  if (isPending) {
    return <PageLoading label="Fetching your dashboard" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  if (contacts === null || reminders === null || importantDates === null) {
    if (error === null) {
      return <PageLoading label="Fetching your dashboard" />;
    }

    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader email={session.user.email} />
        <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-12">
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        </main>
      </div>
    );
  }

  const waiting = reminders.filter(
    (reminder) => reminder.status === "due" || reminder.status === "overdue",
  );
  const overdue = waiting.filter((reminder) => reminder.status === "overdue").length;
  const due = waiting.length - overdue;
  const waitingContactIds = new Set(waiting.map((reminder) => reminder.contactId));
  const waitingCountLine = [
    due > 0 ? `${due} due` : null,
    overdue > 0 ? `${overdue} overdue` : null,
    `${contacts.length - waitingContactIds.size} of ${contacts.length} contacts up to date`,
  ]
    .filter((part) => part !== null)
    .join(" · ");
  const comingUp = importantDates
    .filter((importantDate) =>
      occursWithinDays(importantDate.fallsOn, now, UPCOMING_WINDOW_DAYS),
    )
    .sort((left, right) =>
      nextOccurrence(left.fallsOn, now).localeCompare(nextOccurrence(right.fallsOn, now)),
    );

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        {contacts.length === 0 ? (
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-display-md text-ink">Your people, all in one place.</h1>
            <p className="text-body-md text-ink-secondary">
              Add your first contact, and Memoir will help you stay in touch.
            </p>
            <Button asChild className="self-start">
              <Link to="/app/contacts/new">Add contact</Link>
            </Button>
          </div>
        ) : (
          <>
            <DashboardCard
              linkLabel="See everything"
              linkTo="/app/reminders"
              title="Waiting on you"
            >
              {waiting.length === 0 ? (
                <p className="text-body-md text-ink-secondary">Nothing is waiting.</p>
              ) : (
                <>
                  <p className="text-body-tabular tabular-nums text-ink-mute">
                    {waitingCountLine}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {waiting.map((reminder) => (
                      <ReminderChip key={reminder.id} now={now} reminder={reminder} />
                    ))}
                  </ul>
                </>
              )}
            </DashboardCard>

            <DashboardCard
              linkLabel="All contacts"
              linkTo="/app/contacts"
              title="Coming up"
            >
              {comingUp.length === 0 ? (
                <p className="text-body-md text-ink-secondary">Nothing in the next 30 days.</p>
              ) : (
                <>
                  <p className="text-body-tabular tabular-nums text-ink-mute">
                    {comingUpCountLine(comingUp, now)}
                  </p>
                  <ul className="flex flex-col divide-y divide-hairline">
                    {comingUp.map((importantDate) => (
                      <ComingUpRow importantDate={importantDate} key={importantDate.id} now={now} />
                    ))}
                  </ul>
                </>
              )}
            </DashboardCard>
          </>
        )}
      </main>
    </div>
  );
}
