import {
  importantDateSection,
  importantDatesInTab,
  importantDateYears,
  nextOccurrence,
  reminderInTab,
  reminderSection,
  reminderTabs,
  type Contact,
  type ImportantDateWithContact,
  type ReminderInput,
  type ReminderSection,
  type ReminderTab,
  type ReminderWithContact,
} from "@memoir/core";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { BackToParent } from "../components/back-to-parent";
import { ImportantDateMarker } from "../components/important-date-marker";
import { PageLoading } from "../components/page-loading";
import { ReminderQuickAdd } from "../components/reminder-quick-add";
import { ReminderRow } from "../components/reminder-row";
import {
  createReminder,
  listContacts,
  listDoneReminders,
  listImportantDates,
  listOpenReminders,
  rescheduleReminder,
  tickReminder,
} from "../lib/api";
import { authClient } from "../lib/auth-client";
import { todayForDayCounts, todayIsoDay } from "../lib/format";
import { cn } from "../lib/utils";

type Item =
  | { key: string; when: string; reminder: ReminderWithContact }
  | { key: string; when: string; importantDate: ImportantDateWithContact };

const tabLabels: Record<ReminderTab, string> = {
  all: "All",
  due: "Due & Overdue",
  upcoming: "Upcoming",
  completed: "Completed",
};

const sectionTitles: Record<ReminderSection, string> = {
  overdue: "Overdue",
  "this-week": "Due today & this week",
  upcoming: "Upcoming",
  completed: "Completed",
};

const sectionOrder: ReminderSection[] = ["overdue", "this-week", "upcoming", "completed"];

function sectionChipClass(section: ReminderSection): string {
  if (section === "overdue") {
    return "bg-danger-bg text-danger";
  }

  return section === "completed" ? "bg-canvas-soft text-ink-mute" : "bg-amber-soft text-amber";
}

function Section({
  section,
  count,
  children,
}: {
  section: ReminderSection;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          className={cn(
            "rounded-full px-3 py-0.5 text-micro-cap uppercase",
            sectionChipClass(section),
          )}
        >
          {sectionTitles[section]}
        </h2>
        <span className="text-caption tabular-nums text-ink-mute">{count}</span>
      </div>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
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
        className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas p-4 shadow-sm transition-colors hover:border-hairline-input"
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
  const [doneReminders, setDoneReminders] = useState<ReminderWithContact[] | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDateWithContact[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<ReminderTab>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) {
      return;
    }

    let active = true;

    void Promise.all([listOpenReminders(), listImportantDates(), listContacts()]).then(
      ([reminderResult, dateResult, contactResult]) => {
        if (!active) {
          return;
        }

        const failure = [reminderResult, dateResult, contactResult].find((result) => !result.ok);

        if (failure !== undefined && !failure.ok) {
          setError(failure.message);

          return;
        }

        if (reminderResult.ok && dateResult.ok && contactResult.ok) {
          setReminders(reminderResult.value);
          setImportantDates(dateResult.value);
          setContacts(contactResult.value);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [session]);

  const loadDone = useCallback(async () => {
    const result = await listDoneReminders();

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setDoneReminders(result.value);
  }, []);

  useEffect(() => {
    if (session !== null && tab === "completed") {
      void loadDone();
    }
  }, [session, tab, loadDone]);

  async function handleTick(reminder: ReminderWithContact) {
    setBusyId(reminder.id);
    const result = await tickReminder(reminder.contactId, reminder.id);
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setError(null);
    setReminders((current) => current?.filter((item) => item.id !== reminder.id) ?? current);
    setDoneReminders(null);
  }

  async function handleReschedule(reminder: ReminderWithContact, dueOn: string): Promise<boolean> {
    setBusyId(reminder.id);
    const result = await rescheduleReminder(reminder.contactId, reminder.id, dueOn);
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);

      return false;
    }

    setError(null);
    setReminders(
      (current) =>
        current
          ?.map((item) => (item.id === reminder.id ? { ...item, ...result.value } : item))
          .sort((left, right) => left.dueOn.localeCompare(right.dueOn)) ?? current,
    );

    return true;
  }

  async function handleAdd(contactId: string, input: ReminderInput): Promise<string | null> {
    const result = await createReminder(contactId, input);

    if (!result.ok) {
      return result.message;
    }

    const contact = contacts.find((candidate) => candidate.id === contactId);
    const added = { ...result.value, contactName: contact?.name ?? "" };

    setError(null);
    setReminders((current) =>
      [...(current ?? []), added].sort((left, right) => left.dueOn.localeCompare(right.dueOn)),
    );

    return null;
  }

  const now = todayForDayCounts();
  const today = todayIsoDay();

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
        <main className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-6 py-12">
          <BackToParent label="Back to Dashboard" to="/app" />
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        </main>
      </div>
    );
  }

  const inTab = (tab: ReminderTab) =>
    reminders.filter((reminder) => reminderInTab(reminder, tab)).length +
    (importantDatesInTab(tab) ? importantDates.length : 0);
  const needAction = inTab("due");
  const counts: Record<ReminderTab, number | null> = {
    all: inTab("all"),
    due: needAction,
    upcoming: inTab("upcoming"),
    completed: doneReminders?.length ?? null,
  };

  const items: Item[] = [
    ...(tab === "completed" ? (doneReminders ?? []) : reminders)
      .filter((reminder) => reminderInTab(reminder, tab))
      .map((reminder) => ({ key: reminder.id, when: reminder.dueOn, reminder })),
    ...(importantDatesInTab(tab) ? importantDates : []).map((importantDate) => ({
      key: importantDate.id,
      when: nextOccurrence(importantDate.fallsOn, now),
      importantDate,
    })),
  ].sort((left, right) => left.when.localeCompare(right.when));

  const grouped = new Map<ReminderSection, Item[]>();

  for (const item of items) {
    const section =
      "reminder" in item
        ? reminderSection(item.reminder, today)
        : importantDateSection(item.importantDate.fallsOn, today);

    grouped.set(section, [...(grouped.get(section) ?? []), item]);
  }

  const loadingDone = tab === "completed" && doneReminders === null;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <BackToParent label="Back to Dashboard" to="/app" />

        <div className="flex flex-col justify-between gap-3 border-b border-hairline pb-6 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-display-md text-ink">Reminders &amp; Important Dates</h1>
            <p className="text-body-md text-ink-mute">
              Stay in touch with intentional care. Amber marks what needs your attention.
            </p>
          </div>
          <p className="flex w-fit items-center gap-2 rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-caption text-ink-secondary">
            <span aria-hidden className="h-2 w-2 rounded-full bg-amber-fill" />
            <span className="tabular-nums">
              {needAction} {needAction === 1 ? "item needs" : "items need"} action
            </span>
          </p>
        </div>

        <div
          aria-label="Filter reminders"
          className="flex w-fit flex-wrap items-center gap-1 rounded-xl border border-hairline bg-canvas-soft p-1"
          role="tablist"
        >
          {reminderTabs.map((candidate) => (
            <button
              aria-selected={tab === candidate}
              className={cn(
                "rounded-lg px-3 py-1.5 text-button-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === candidate
                  ? "bg-canvas text-primary-container shadow-sm"
                  : "text-ink-mute hover:text-ink",
              )}
              key={candidate}
              onClick={() => setTab(candidate)}
              role="tab"
              type="button"
            >
              {tabLabels[candidate]}
              {counts[candidate] !== null && (
                <span className="ml-1 tabular-nums">({counts[candidate]})</span>
              )}
            </button>
          ))}
        </div>

        <ReminderQuickAdd contacts={contacts} onAdd={handleAdd} today={today} />

        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger">{error}</p>
        )}

        {loadingDone ? (
          <p className="text-body-md text-ink-secondary">Fetching what you've finished.</p>
        ) : items.length === 0 ? (
          <p className="text-body-md text-ink-secondary">
            {tab === "completed"
              ? "Nothing is done yet. Tick off a reminder and it will show up here."
              : "Nothing is waiting. Add a reminder or an important date to a contact, and it will show up here."}
          </p>
        ) : (
          sectionOrder.map((section) => {
            const sectionItems = grouped.get(section);

            if (sectionItems === undefined) {
              return null;
            }

            return (
              <Section count={sectionItems.length} key={section} section={section}>
                {sectionItems.map((item) =>
                  "reminder" in item ? (
                    <ReminderRow
                      busy={busyId === item.reminder.id}
                      key={item.key}
                      now={now}
                      onReschedule={(dueOn) => handleReschedule(item.reminder, dueOn)}
                      onTick={() => void handleTick(item.reminder)}
                      reminder={item.reminder}
                    />
                  ) : (
                    <ImportantDateRow importantDate={item.importantDate} key={item.key} now={now} />
                  ),
                )}
              </Section>
            );
          })
        )}
      </main>
    </div>
  );
}
