import type { GoogleEventDraft, RemoteEvent } from "@memoir/core";
import { addDays } from "@memoir/core";

import {
  GoogleApiError,
  type ChangeListing,
  type GoogleCalendarClient,
  type GoogleCalendarSummary,
  type ImportedEvent,
} from "./client";

const API = "https://www.googleapis.com/calendar/v3";
const MAX_PAGES = 20;

type ApiEvent = {
  id: string;
  status?: string;
  summary?: string;
  updated?: string;
  hangoutLink?: string;
  extendedProperties?: { private?: Record<string, string> };
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

type EventsPage = {
  items?: ApiEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

function firstDay(point: ApiEvent["start"]): string | null {
  const value = point?.date ?? point?.dateTime;

  return value === undefined ? null : value.slice(0, 10);
}

function toRemoteEvent(event: ApiEvent): RemoteEvent {
  return {
    id: event.id,
    cancelled: event.status === "cancelled",
    summary: event.summary ?? "",
    startDate: firstDay(event.start),
    updated: event.updated === undefined ? 0 : Date.parse(event.updated),
    ours: event.extendedProperties?.private?.memoirKind !== undefined,
  };
}

function toImportedEvent(event: ApiEvent): ImportedEvent | null {
  const date = firstDay(event.start);

  if (date === null || event.status === "cancelled") {
    return null;
  }

  const video = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video");

  return {
    id: event.id,
    title: event.summary ?? "(No title)",
    date,
    start: event.start?.dateTime ?? event.start?.date ?? date,
    end: event.end?.dateTime ?? event.end?.date ?? date,
    meetUrl: event.hangoutLink ?? video?.uri ?? null,
  };
}

/** Google Calendar over HTTP, authorised by a function that hands back a fresh access token. */
export function createHttpGoogleClient(accessToken: () => Promise<string>): GoogleCalendarClient {
  async function call<T>(
    path: string,
    init: { method?: string; body?: unknown; tolerate?: number[] } = {},
  ): Promise<T | null> {
    const response = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });

    if (response.status === 204 || init.tolerate?.includes(response.status) === true) {
      return null;
    }

    if (!response.ok) {
      throw new GoogleApiError(response.status, `Google Calendar answered ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  async function listAll(path: string): Promise<{ events: ApiEvent[]; nextSyncToken: string | null }> {
    const events: ApiEvent[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | null = null;

    for (let page = 0; ; page += 1) {
      if (page >= MAX_PAGES) {
        // A cut-off listing would read every event past the cut as deleted.
        throw new GoogleApiError(502, "That calendar has too many events to read in one go.");
      }

      const suffix = pageToken === undefined ? "" : `&pageToken=${encodeURIComponent(pageToken)}`;
      const result = await call<EventsPage>(`${path}${suffix}`);

      events.push(...(result?.items ?? []));
      nextSyncToken = result?.nextSyncToken ?? nextSyncToken;
      pageToken = result?.nextPageToken;

      if (pageToken === undefined) {
        break;
      }
    }

    return { events, nextSyncToken };
  }

  async function changes(calendarId: string, syncToken: string | null): Promise<ChangeListing> {
    const base = `/calendars/${encodeURIComponent(calendarId)}/events?maxResults=250`;
    const path =
      syncToken === null
        ? `${base}&showDeleted=false`
        : `${base}&syncToken=${encodeURIComponent(syncToken)}`;
    const listing = await listAll(path);

    return {
      events: listing.events.map(toRemoteEvent),
      nextSyncToken: listing.nextSyncToken,
      full: syncToken === null,
    };
  }

  return {
    async listCalendars(): Promise<GoogleCalendarSummary[]> {
      const result = await call<{
        items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean }[];
      }>("/users/me/calendarList");

      return (result?.items ?? []).map((item) => ({
        id: item.id,
        name: item.summaryOverride ?? item.summary ?? item.id,
        primary: item.primary === true,
      }));
    },

    async createCalendar(name: string): Promise<string> {
      const result = await call<{ id: string }>("/calendars", {
        method: "POST",
        body: { summary: name, description: "Reminders and Important Dates from Memoir." },
      });

      if (result === null) {
        throw new GoogleApiError(502, "Google Calendar didn't return the new calendar.");
      }

      return result.id;
    },

    async listChanges(calendarId, syncToken) {
      try {
        return await changes(calendarId, syncToken);
      } catch (error) {
        if (error instanceof GoogleApiError && error.status === 410 && syncToken !== null) {
          return changes(calendarId, null);
        }

        throw error;
      }
    },

    async listEvents(calendarId, from, to) {
      const path =
        `/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime` +
        `&maxResults=250&timeMin=${encodeURIComponent(`${from}T00:00:00Z`)}` +
        `&timeMax=${encodeURIComponent(`${addDays(to, 1)}T00:00:00Z`)}`;
      const listing = await listAll(path);

      return listing.events
        .map(toImportedEvent)
        .filter((event): event is ImportedEvent => event !== null);
    },

    async insertEvent(calendarId, draft: GoogleEventDraft) {
      const result = await call<ApiEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: "POST",
        body: draft,
      });

      if (result === null) {
        throw new GoogleApiError(502, "Google Calendar didn't return the new event.");
      }

      return { id: result.id, updated: toRemoteEvent(result).updated };
    },

    async updateEvent(calendarId, eventId, draft) {
      const result = await call<ApiEvent>(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          // A timed event edited in Google becomes an all-day one again.
          body: { ...draft, start: { ...draft.start, dateTime: null }, end: { ...draft.end, dateTime: null } },
        },
      );

      return { updated: result === null ? Date.now() : toRemoteEvent(result).updated };
    },

    async deleteEvent(calendarId, eventId) {
      await call<null>(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "DELETE", tolerate: [404, 410] },
      );
    },
  };
}
