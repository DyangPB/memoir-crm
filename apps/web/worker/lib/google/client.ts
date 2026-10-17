import type { GoogleEventDraft, RemoteEvent } from "@memoir/core";

export const MEMOIR_CALENDAR_NAME = "Memoir";

export type GoogleCalendarSummary = {
  id: string;
  name: string;
  primary: boolean;
};

/** A Google event shown as a read-only layer on the Calendar. */
export type ImportedEvent = {
  id: string;
  title: string;
  /** The event's first day. */
  date: string;
  start: string;
  end: string;
  meetUrl: string | null;
};

export type ChangeListing = {
  events: RemoteEvent[];
  /** Null when Google gave none, so the next run lists everything again. */
  nextSyncToken: string | null;
  /** True when this is the whole calendar rather than what changed since the token. */
  full: boolean;
};

/**
 * Everything Memoir needs from Google Calendar, and nothing more. The real client
 * talks to Google over HTTP; tests swap in a fake, so sync logic never depends on
 * the network.
 */
export type GoogleCalendarClient = {
  listCalendars: () => Promise<GoogleCalendarSummary[]>;
  createCalendar: (name: string) => Promise<string>;
  /** Changes to a calendar since a sync token, or the whole calendar when the token is null or expired. */
  listChanges: (calendarId: string, syncToken: string | null) => Promise<ChangeListing>;
  /** Events falling in a range of days, recurring ones expanded, for display. */
  listEvents: (calendarId: string, from: string, to: string) => Promise<ImportedEvent[]>;
  insertEvent: (
    calendarId: string,
    draft: GoogleEventDraft,
  ) => Promise<{ id: string; updated: number }>;
  updateEvent: (
    calendarId: string,
    eventId: string,
    draft: GoogleEventDraft,
  ) => Promise<{ updated: number }>;
  /** Deleting an event that is already gone is not an error. */
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>;
};

/** Google refused the stored sign-in: the user needs to connect again. */
export class GoogleAuthError extends Error {}

export class GoogleApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
