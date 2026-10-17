import {
  calendarRange,
  calendarViews,
  groupItemsByDay,
  stepAnchor,
  type CalendarItem,
  type CalendarRange,
  type CalendarView,
  type Contact,
  type ReminderInput,
} from "@memoir/core";
import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import { AppHeader } from "../components/app-header";
import { BackToParent } from "../components/back-to-parent";
import { CalendarAddReminder } from "../components/calendar-add-reminder";
import {
  AgendaView,
  DayItems,
  DayView,
  MonthGridView,
  WeekView,
} from "../components/calendar-views";
import { Icon } from "../components/icon";
import { PageLoading } from "../components/page-loading";
import { Button } from "../components/ui/button";
import { createReminder, listCalendar, listContacts } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { dayLabel, rangeTitle, viewLabels } from "../lib/calendar";
import { isoDayOrNull, todayIsoDay } from "../lib/format";
import { cn } from "../lib/utils";

type Layer = CalendarItem["kind"];

const layerLabels: Record<Layer, string> = {
  reminder: "Reminders",
  "important-date": "Important Dates",
};

const layers: Layer[] = ["reminder", "important-date"];

function viewFrom(value: string | null): CalendarView {
  return calendarViews.find((view) => view === value) ?? "month";
}

export function CalendarPage() {
  const { data: session, isPending } = authClient.useSession();
  const signedIn = session !== null;
  const [params, setParams] = useSearchParams();
  const today = todayIsoDay();
  const view = viewFrom(params.get("view"));
  const anchor = isoDayOrNull(params.get("date")) ?? today;
  const range = calendarRange(view, anchor);

  const [feed, setFeed] = useState<{ range: CalendarRange; items: CalendarItem[] } | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<Layer>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    let active = true;

    void listContacts().then((result) => {
      if (!active) {
        return;
      }

      if (result.ok) {
        setContacts(result.value);
      } else {
        setError(result.message);
      }
    });

    return () => {
      active = false;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    let active = true;

    void listCalendar(range.from, range.to).then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setError(result.message);

        return;
      }

      setError(null);
      setFeed({ range: { from: range.from, to: range.to }, items: result.value });
    });

    return () => {
      active = false;
    };
  }, [signedIn, range.from, range.to, reloads]);

  /** The URL's date is the selected day, so a view switch, back button or link keeps it. */
  function go(next: { view?: CalendarView; date?: string }, replace = false) {
    setParams({ view: next.view ?? view, date: next.date ?? anchor }, { replace });
  }

  function selectDay(day: string) {
    go({ date: day }, true);
  }

  function toggleLayer(layer: Layer) {
    setHidden((current) => {
      const next = new Set(current);

      if (!next.delete(layer)) {
        next.add(layer);
      }

      return next;
    });
  }

  async function handleAdd(contactId: string, input: ReminderInput): Promise<string | null> {
    const result = await createReminder(contactId, input);

    if (!result.ok) {
      return result.message;
    }

    setReloads((count) => count + 1);
    go({ date: input.dueOn });

    return null;
  }

  if (isPending) {
    return <PageLoading label="Opening the calendar" />;
  }

  if (session === null) {
    return <Navigate replace to="/login" />;
  }

  if (feed === null) {
    if (error === null) {
      return <PageLoading label="Opening the calendar" />;
    }

    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader email={session.user.email} />
        <main className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 py-12">
          <BackToParent label="Back to Dashboard" to="/app" />
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
            {error}
          </p>
        </main>
      </div>
    );
  }

  const shown = feed.items.filter((item) => !hidden.has(item.kind));
  const selectedItems = groupItemsByDay(shown).get(anchor) ?? [];
  // The previous range's items stay up, dimmed, until the new range arrives.
  const loading = feed.range.from !== range.from || feed.range.to !== range.to;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader email={session.user.email} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
        <BackToParent label="Back to Dashboard" to="/app" />

        <div className="flex flex-col justify-between gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-display-md text-ink">Calendar</h1>
            <p className="text-body-md text-ink-mute">
              Your Reminders and Important Dates in time. Amber marks a date to remember.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Icon className="text-body-md" name="add" />
            Add reminder
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              aria-label="Previous"
              onClick={() => go({ date: stepAnchor(view, anchor, -1) })}
              variant="secondary"
            >
              <Icon className="text-body-md" name="chevron_left" />
            </Button>
            <h2 className="min-w-44 text-center font-display text-display-md text-ink">
              {rangeTitle(view, anchor, range)}
            </h2>
            <Button
              aria-label="Next"
              onClick={() => go({ date: stepAnchor(view, anchor, 1) })}
              variant="secondary"
            >
              <Icon className="text-body-md" name="chevron_right" />
            </Button>
            <Button onClick={() => go({ date: today })} variant="ghost">
              Today
            </Button>
          </div>

          <div
            aria-label="Calendar view"
            className="flex items-center gap-1 rounded-xl border border-hairline bg-canvas-soft p-1"
            role="group"
          >
            {calendarViews.map((candidate) => (
              <button
                aria-pressed={view === candidate}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-button-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === candidate
                    ? "bg-canvas text-primary-container shadow-sm"
                    : "text-ink-mute hover:text-ink",
                )}
                key={candidate}
                onClick={() => go({ view: candidate })}
                type="button"
              >
                {viewLabels[candidate]}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="sr-only">Show on the calendar</legend>
          {layers.map((layer) => (
            <label className="flex items-center gap-2 text-body-md text-ink-secondary" key={layer}>
              <input
                checked={!hidden.has(layer)}
                className="size-4 accent-primary"
                onChange={() => toggleLayer(layer)}
                type="checkbox"
              />
              {layerLabels[layer]}
            </label>
          ))}
        </fieldset>

        {adding && (
          <CalendarAddReminder
            contacts={contacts}
            day={anchor}
            onAdd={handleAdd}
            onClose={() => setAdding(false)}
          />
        )}

        {error !== null && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
            {error}
          </p>
        )}

        <div aria-busy={loading} className={cn("flex flex-col gap-6", loading && "opacity-60")}>
        {view === "month" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <MonthGridView
              items={shown}
              month={anchor.slice(0, 7)}
              onSelect={selectDay}
              selected={anchor}
              today={today}
            />
            <aside aria-label="Selected day" className="flex flex-col gap-3">
              <h2 className="text-heading-lg text-ink">{dayLabel(anchor)}</h2>
              <DayItems items={selectedItems} today={today} />
            </aside>
          </div>
        )}
        {view === "week" && (
          <WeekView
            anchor={anchor}
            items={shown}
            onSelect={selectDay}
            selected={anchor}
            today={today}
          />
        )}
        {view === "day" && <DayView day={anchor} items={shown} today={today} />}
        {view === "agenda" && <AgendaView items={shown} range={range} today={today} />}
        </div>
      </main>
    </div>
  );
}
