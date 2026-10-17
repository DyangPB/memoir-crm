import {
  CATCH_UP_AFTER_DAYS,
  contactsToCatchUp,
  importantDateYears,
  interactionTypeLabel,
  nextOccurrence,
  occursWithinDays,
  UPCOMING_WINDOW_DAYS,
  type Contact,
  type ImportantDateWithContact,
  type OnThisDay,
  type ReminderWithContact,
} from "@memoir/core";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { Icon } from "../components/icon";
import { LetterAvatar } from "../components/letter-avatar";
import { LogInteractionDialog } from "../components/log-interaction-dialog";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { getOnThisDay, listContacts, listImportantDates, listOpenReminders } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatDay, todayIsoDay } from "../lib/format";
import { importantDateTiming } from "../lib/important-dates";
import { reminderChipClass, reminderTiming } from "../lib/reminders";
import { cn } from "../lib/utils";

type DashboardCardProps = {
  title: string;
  linkLabel: string;
  linkTo: string;
  edge?: boolean;
  children: ReactNode;
};

function DashboardCard({ title, linkLabel, linkTo, edge = false, children }: DashboardCardProps) {
  return (
    <section className="relative flex flex-col gap-3 overflow-hidden rounded-lg border border-hairline bg-canvas p-6 shadow-card">
      {edge && <div aria-hidden className="airmail-edge absolute inset-x-0 top-0 h-1.5" />}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-headline-sm text-ink">{title}</h2>
        <Link
          className="inline-flex items-center gap-1 text-label-lg text-primary hover:text-primary-press"
          to={linkTo}
        >
          {linkLabel}
          <Icon className="text-base" name="arrow_forward" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function greeting(now: Date, name: string): string {
  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const first = name.includes("@") ? "" : (name.trim().split(/\s+/)[0] ?? "");

  return first === "" ? `Good ${part}` : `Good ${part}, ${first}`;
}

function ReminderRow({ reminder, now }: { reminder: ReminderWithContact; now: Date }) {
  return (
    <li>
      <Link
        className="-mx-2 flex items-center justify-between gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-canvas-soft"
        to={`/app/contacts/${reminder.contactId}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            className={cn(
              "text-xl",
              reminder.status === "overdue" ? "text-danger" : "text-tertiary",
            )}
            name={reminder.status === "overdue" ? "priority_high" : "schedule"}
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body-md font-medium text-ink">{reminder.body}</span>
            <span className="truncate text-caption text-ink-mute">{reminder.contactName}</span>
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-caption tabular-nums",
            reminderChipClass(reminder.status),
          )}
        >
          {reminderTiming(reminder, now)}
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

function CatchUpCard({ contact }: { contact: Contact & { daysSince: number } }) {
  return (
    <li>
      <Link
        className="flex h-full items-center gap-4 rounded-lg border border-hairline p-4 transition-colors hover:bg-canvas-soft"
        to={`/app/contacts/${contact.id}`}
      >
        <LetterAvatar name={contact.name} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-display text-contact-name text-ink">{contact.name}</span>
          <span className="flex items-baseline gap-1.5 text-caption text-ink-mute">
            <span className="font-display text-numeral tabular-nums text-ink">
              {contact.daysSince}
            </span>
            days since you talked
          </span>
        </span>
      </Link>
    </li>
  );
}

function comingUpCountLine(importantDates: ImportantDateWithContact[], now: Date): string {
  const count =
    importantDates.length === 1
      ? `1 birthday or date in the next ${UPCOMING_WINDOW_DAYS} days`
      : `${importantDates.length} birthdays and dates in the next ${UPCOMING_WINDOW_DAYS} days`;
  const next = importantDates[0];

  return next === undefined ? count : `${count} · next: ${importantDateTiming(next.fallsOn, now)}`;
}

function OnThisDayStrip({ memory }: { memory: OnThisDay }) {
  return (
    <aside className="flex items-start gap-4 rounded-lg bg-vellum p-6">
      <Icon className="mt-0.5 text-2xl text-primary-container" name="auto_stories" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-label-md uppercase tracking-wider text-ink-mute">
          On this day · {memory.yearsAgo === 1 ? "1 year ago" : `${memory.yearsAgo} years ago`}
        </p>
        <p className="font-display text-headline-sm text-ink">
          {memory.note ?? `In touch with ${memory.contactName}`}
        </p>
        <p className="text-caption text-ink-mute">
          {interactionTypeLabel(memory.type)} with {memory.contactName} ·{" "}
          {formatDay(memory.occurredOn)}
        </p>
        <Link
          className="inline-flex w-fit items-center gap-1 text-label-lg text-primary hover:text-primary-press"
          to={`/app/contacts/${memory.contactId}`}
        >
          Open {memory.contactName}
          <Icon className="text-base" name="arrow_forward" />
        </Link>
      </div>
    </aside>
  );
}

export function AppPage() {
  const { data: session, isPending } = authClient.useSession();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [reminders, setReminders] = useState<ReminderWithContact[] | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDateWithContact[] | null>(null);
  const [onThisDay, setOnThisDay] = useState<OnThisDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const signedIn = session !== null && session !== undefined;

  const load = useCallback(async () => {
    const [contactResult, reminderResult, dateResult, memoryResult] = await Promise.all([
      listContacts(),
      listOpenReminders(),
      listImportantDates(),
      getOnThisDay(todayIsoDay()),
    ]);

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
    // A memory is a nicety: if it can't load, the strip stays hidden.
    setOnThisDay(memoryResult.ok ? memoryResult.value : null);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    void load();
  }, [signedIn, load]);

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
  const catchUp = contactsToCatchUp(contacts, now);

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
            <header className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-display-lg text-ink">
                {greeting(now, session.user.name)}
              </h1>
              <Button onClick={() => setLogging(true)} type="button">
                <Icon className="text-lg" name="history_edu" />
                Log interaction
              </Button>
            </header>

            <DashboardCard
              edge
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
                  <ul className="flex flex-col divide-y divide-hairline">
                    {waiting.map((reminder) => (
                      <ReminderRow key={reminder.id} now={now} reminder={reminder} />
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
                <p className="text-body-md text-ink-secondary">Nothing in the next {UPCOMING_WINDOW_DAYS} days.</p>
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

            <DashboardCard
              linkLabel="All contacts"
              linkTo="/app/contacts"
              title="People to catch up with"
            >
              {catchUp.length === 0 ? (
                <p className="text-body-md text-ink-secondary">
                  You're in touch with everyone lately.
                </p>
              ) : (
                <>
                  <p className="text-body-tabular tabular-nums text-ink-mute">
                    Contacts quiet for more than {CATCH_UP_AFTER_DAYS} days
                  </p>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {catchUp.map((contact) => (
                      <CatchUpCard contact={contact} key={contact.id} />
                    ))}
                  </ul>
                </>
              )}
            </DashboardCard>

            {onThisDay !== null && <OnThisDayStrip memory={onThisDay} />}

            <LogInteractionDialog
              contacts={contacts}
              onClose={() => setLogging(false)}
              onLogged={() => void load()}
              open={logging}
            />
          </>
        )}
      </main>
    </div>
  );
}
