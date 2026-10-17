import {
  calendarItemTitle,
  groupItemsByDay,
  monthGrid,
  weekdayOf,
  weekOf,
  type CalendarItem,
  type CalendarRange,
} from "@memoir/core";
import { Link } from "react-router";

import { dayLabel, dayNumber, itemChipClass, itemKindLabel, weekdayHeadings } from "../lib/calendar";
import { cn } from "../lib/utils";
import { ItemChip } from "./calendar-item-chip";

const CHIPS_PER_CELL = 3;

type DayChipsProps = {
  items: CalendarItem[];
  today: string;
  onSelect: (day: string) => void;
  limit?: number;
};

function DayChips({ items, today, onSelect, limit = CHIPS_PER_CELL }: DayChipsProps) {
  const shown = items.slice(0, limit);
  const more = items.length - shown.length;

  return (
    <ul className="flex flex-col gap-1">
      {shown.map((item) => (
        <ItemChip item={item} key={`${item.kind}-${item.id}-${item.date}`} onSelect={onSelect} today={today} />
      ))}
      {more > 0 && <li className="px-1.5 text-caption text-ink-mute">+{more} more</li>}
    </ul>
  );
}

type SelectableProps = {
  items: CalendarItem[];
  today: string;
  selected: string;
  onSelect: (day: string) => void;
};

type DayButtonProps = {
  day: string;
  today: string;
  selected: boolean;
  dim?: boolean;
  onSelect: (day: string) => void;
};

function DayButton({ day, today, selected, dim = false, onSelect }: DayButtonProps) {
  return (
    <button
      aria-current={day === today ? "date" : undefined}
      aria-label={dayLabel(day)}
      aria-pressed={selected}
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-body-tabular tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary-container text-on-primary"
          : day === today
            ? "border border-primary-container text-primary-container"
            : dim
              ? "text-ink-mute hover:bg-canvas-soft"
              : "text-ink hover:bg-canvas-soft",
      )}
      onClick={() => onSelect(day)}
      type="button"
    >
      {dayNumber(day)}
    </button>
  );
}

type MonthGridProps = SelectableProps & { month: string };

export function MonthGridView({ month, items, today, selected, onSelect }: MonthGridProps) {
  const byDay = groupItemsByDay(items);
  const days = monthGrid(month);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));

  return (
    <div
      aria-label={`Calendar for ${month}`}
      className="overflow-hidden rounded-xl border border-hairline bg-canvas"
      role="grid"
    >
      <div className="grid grid-cols-7 border-b border-hairline bg-canvas-soft" role="row">
        {weekdayHeadings.map((heading) => (
          <div
            className="px-2 py-2 text-center text-micro-cap uppercase text-ink-mute"
            key={heading}
            role="columnheader"
          >
            {heading}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          className="grid grid-cols-7 border-b border-hairline last:border-b-0"
          key={week[0]}
          role="row"
        >
          {week.map((day) => (
            <div
              aria-label={dayLabel(day)}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-r border-hairline p-1.5 last:border-r-0",
                !day.startsWith(month) && "bg-canvas-soft/40",
                day === selected && "bg-primary-bg-subdued/40",
              )}
              key={day}
              role="gridcell"
            >
              <DayButton
                day={day}
                dim={!day.startsWith(month)}
                onSelect={onSelect}
                selected={day === selected}
                today={today}
              />
              <DayChips items={byDay.get(day) ?? []} onSelect={onSelect} today={today} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function WeekView({ anchor, items, today, selected, onSelect }: SelectableProps & { anchor: string }) {
  const byDay = groupItemsByDay(items);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {weekOf(anchor).map((day) => (
        <section
          aria-label={dayLabel(day)}
          className={cn(
            "flex min-h-32 flex-col gap-2 rounded-xl border border-hairline bg-canvas p-2",
            day === selected && "border-primary-container",
          )}
          key={day}
        >
          <div className="flex items-center justify-between">
            <span className="text-micro-cap uppercase text-ink-mute">
              {weekdayHeadings[weekdayOf(day)]}
            </span>
            <DayButton day={day} onSelect={onSelect} selected={day === selected} today={today} />
          </div>
          <DayChips items={byDay.get(day) ?? []} limit={20} onSelect={onSelect} today={today} />
        </section>
      ))}
    </div>
  );
}

const rowClass =
  "flex items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas p-3";

function ItemRow({ item, today }: { item: CalendarItem; today: string }) {
  const years = item.kind === "important-date" ? item.yearsOld : null;

  if (item.kind === "google") {
    return (
      <li className={rowClass}>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-body-md text-ink">{item.title}</span>
          <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-micro-cap uppercase text-ink-secondary w-fit">
            {itemKindLabel(item)}
          </span>
        </span>
        {item.meetUrl !== null && (
          <a
            className="shrink-0 text-caption text-primary underline-offset-2 hover:underline"
            href={item.meetUrl}
            rel="noreferrer"
            target="_blank"
          >
            Join meeting
          </a>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        className={cn(rowClass, "transition-colors hover:border-hairline-input")}
        to={`/app/contacts/${item.contactId}`}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              "truncate text-body-md",
              item.kind === "reminder" && item.done ? "text-ink-mute line-through" : "text-ink",
            )}
          >
            {calendarItemTitle(item)}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-micro-cap uppercase",
                itemChipClass(item, today),
              )}
            >
              {itemKindLabel(item)}
            </span>
            <span className="text-caption text-ink-mute">{item.contactName}</span>
          </span>
        </span>
        {years !== null && (
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="font-display text-display-md tabular-nums text-ink">{years}</span>
            <span className="text-caption text-ink-mute">years</span>
          </span>
        )}
      </Link>
    </li>
  );
}

export function DayItems({ items, today }: { items: CalendarItem[]; today: string }) {
  if (items.length === 0) {
    return <p className="text-body-md text-ink-mute">Nothing on this day.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <ItemRow item={item} key={`${item.kind}-${item.id}-${item.date}`} today={today} />
      ))}
    </ul>
  );
}

export function DayView({ day, items, today }: { day: string; items: CalendarItem[]; today: string }) {
  return <DayItems items={groupItemsByDay(items).get(day) ?? []} today={today} />;
}

export function AgendaView({
  range,
  items,
  today,
}: {
  range: CalendarRange;
  items: CalendarItem[];
  today: string;
}) {
  const byDay = groupItemsByDay(items);
  const days = [...byDay.keys()].filter((day) => day >= range.from && day <= range.to).sort();

  if (days.length === 0) {
    return <p className="text-body-md text-ink-mute">Nothing is coming up in this stretch.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section className="flex flex-col gap-2" key={day}>
          <h3 className="text-heading-lg text-ink">{dayLabel(day)}</h3>
          <DayItems items={byDay.get(day) ?? []} today={today} />
        </section>
      ))}
    </div>
  );
}
