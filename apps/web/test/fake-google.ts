import { addDays, type GoogleEventDraft } from "@memoir/core";

import {
  GoogleApiError,
  type ChangeListing,
  type GoogleCalendarClient,
  type GoogleCalendarSummary,
  type ImportedEvent,
} from "../worker/lib/google/client";

export type FakeEvent = {
  id: string;
  summary: string;
  description: string;
  startDate: string;
  /** The day after the event's last day, as Google's all-day events carry it. */
  endDate: string;
  recurrence: string[] | null;
  memoirKind: string | null;
  memoirId: string | null;
  updated: number;
  cancelled: boolean;
  /** Orders changes, standing in for Google's sync tokens. */
  seq: number;
};

type FakeCalendar = {
  name: string;
  primary: boolean;
  events: Map<string, FakeEvent>;
};

/** An in-memory Google Calendar that behaves like the real one where sync depends on it. */
export class FakeGoogle implements GoogleCalendarClient {
  readonly calendars = new Map<string, FakeCalendar>();
  /** When set, every call throws it. */
  failure: Error | null = null;
  /** The next call to `listChanges` answers with a full listing, as if its token had expired. */
  expireNextToken = false;
  /** How many times `insertEvent` was called, to catch duplicate pushes. */
  inserts = 0;

  private seq = 0;
  private lastUpdated = 0;
  private nextId = 1;

  constructor() {
    this.calendars.set("primary", { name: "Personal", primary: true, events: new Map() });
    this.calendars.set("work", { name: "Work", primary: false, events: new Map() });
  }

  private tick(): number {
    this.lastUpdated = Math.max(this.lastUpdated + 1, Date.now());
    this.seq += 1;

    return this.lastUpdated;
  }

  private calendar(id: string): FakeCalendar {
    const found = this.calendars.get(id);

    if (found === undefined) {
      throw new GoogleApiError(404, `No calendar ${id}.`);
    }

    return found;
  }

  private check(): void {
    if (this.failure !== null) {
      throw this.failure;
    }
  }

  /** The events Memoir should currently see on a calendar. */
  eventsIn(calendarId: string): FakeEvent[] {
    return [...this.calendar(calendarId).events.values()].filter((event) => !event.cancelled);
  }

  /** The calendar Memoir created, if it has. */
  memoirCalendarId(): string | undefined {
    return [...this.calendars.entries()].find(([, calendar]) => calendar.name === "Memoir")?.[0];
  }

  /** Someone edits an event in Google itself. */
  editInGoogle(
    calendarId: string,
    eventId: string,
    changes: { summary?: string; startDate?: string },
  ): void {
    const event = this.calendar(calendarId).events.get(eventId);

    if (event === undefined) {
      throw new Error(`No event ${eventId}`);
    }

    Object.assign(event, changes, { updated: this.tick(), seq: this.seq });
  }

  /** Someone deletes an event in Google itself. */
  deleteInGoogle(calendarId: string, eventId: string): void {
    const event = this.calendar(calendarId).events.get(eventId);

    if (event === undefined) {
      throw new Error(`No event ${eventId}`);
    }

    Object.assign(event, { cancelled: true, updated: this.tick(), seq: this.seq });
  }

  /** An event the user made in Google, for a layer to display. */
  addToGoogle(calendarId: string, summary: string, startDate: string, endDate?: string): string {
    const id = `g${this.nextId++}`;

    this.calendar(calendarId).events.set(id, {
      id,
      summary,
      description: "",
      startDate,
      endDate: endDate ?? addDays(startDate, 1),
      recurrence: null,
      memoirKind: null,
      memoirId: null,
      updated: this.tick(),
      cancelled: false,
      seq: this.seq,
    });

    return id;
  }

  async listCalendars(): Promise<GoogleCalendarSummary[]> {
    this.check();

    return [...this.calendars.entries()].map(([id, calendar]) => ({
      id,
      name: calendar.name,
      primary: calendar.primary,
    }));
  }

  async createCalendar(name: string): Promise<string> {
    this.check();

    const id = `cal${this.nextId++}`;

    this.calendars.set(id, { name, primary: false, events: new Map() });

    return id;
  }

  async listChanges(calendarId: string, syncToken: string | null): Promise<ChangeListing> {
    this.check();

    const events = [...this.calendar(calendarId).events.values()];
    const full = syncToken === null || this.expireNextToken;

    this.expireNextToken = false;

    const wanted = full
      ? events.filter((event) => !event.cancelled)
      : events.filter((event) => event.seq > Number(syncToken));

    return {
      full,
      nextSyncToken: String(this.seq),
      events: wanted.map((event) => ({
        id: event.id,
        cancelled: event.cancelled,
        summary: event.summary,
        startDate: event.startDate,
        updated: event.updated,
        ours: event.memoirKind !== null,
      })),
    };
  }

  async listEvents(calendarId: string, from: string, to: string): Promise<ImportedEvent[]> {
    this.check();

    return this.eventsIn(calendarId)
      .filter((event) => event.startDate <= to && event.endDate > from)
      .map((event) => ({
        id: event.id,
        title: event.summary,
        date: event.startDate,
        start: event.startDate,
        end: event.endDate,
        meetUrl: null,
      }));
  }

  async insertEvent(
    calendarId: string,
    draft: GoogleEventDraft,
  ): Promise<{ id: string; updated: number }> {
    this.check();

    this.inserts += 1;

    const id = `e${this.nextId++}`;
    const updated = this.tick();

    this.calendar(calendarId).events.set(id, {
      id,
      summary: draft.summary,
      description: draft.description,
      startDate: draft.start.date,
      endDate: draft.end.date,
      recurrence: draft.recurrence ?? null,
      memoirKind: draft.extendedProperties.private.memoirKind,
      memoirId: draft.extendedProperties.private.memoirId,
      updated,
      cancelled: false,
      seq: this.seq,
    });

    return { id, updated };
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    draft: GoogleEventDraft,
  ): Promise<{ updated: number }> {
    this.check();

    const event = this.calendar(calendarId).events.get(eventId);

    if (event === undefined || event.cancelled) {
      throw new GoogleApiError(404, `No event ${eventId}.`);
    }

    const updated = this.tick();

    Object.assign(event, {
      summary: draft.summary,
      description: draft.description,
      startDate: draft.start.date,
      endDate: draft.end.date,
      recurrence: draft.recurrence ?? null,
      updated,
      seq: this.seq,
    });

    return { updated };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    this.check();

    const event = this.calendar(calendarId).events.get(eventId);

    if (event !== undefined && !event.cancelled) {
      Object.assign(event, { cancelled: true, updated: this.tick(), seq: this.seq });
    }
  }
}
