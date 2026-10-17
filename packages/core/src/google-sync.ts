import { addDays } from "./iso-day";

/** The Google permission Memoir asks for to read and write calendars. */
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export type MirrorKind = "reminder" | "important-date";

/** How freely Google may change an item: a birthday follows its Contact, so Memoir wins. */
export type MirrorMode = "full" | "push-only";

/** A Reminder or Important Date as the sync sees it. */
export type MirrorItem = {
  kind: MirrorKind;
  id: string;
  title: string;
  /** The Reminder's due day, or the Important Date's original day (it recurs yearly). */
  date: string;
  contactName: string;
  /** When the item last changed in Memoir, in epoch milliseconds. */
  updatedAt: number;
  /** A ticked-off Reminder has no event. */
  done: boolean;
  mirror: MirrorMode;
};

/** What Memoir writes to the "Memoir" Google calendar. */
export type GoogleEventDraft = {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  recurrence?: string[];
  extendedProperties: { private: { memoirKind: MirrorKind; memoirId: string } };
};

/** A Google event as the sync needs it, already flattened by the Google client. */
export type RemoteEvent = {
  id: string;
  cancelled: boolean;
  summary: string;
  /** The event's first day, whether it is all-day or timed; null when Google gave none. */
  startDate: string | null;
  /** When the event last changed in Google, in epoch milliseconds. */
  updated: number;
  /** True when Memoir wrote it (it carries Memoir's marker), as opposed to the user. */
  ours?: boolean;
};

export function toGoogleEvent(item: MirrorItem): GoogleEventDraft {
  const isReminder = item.kind === "reminder";

  return {
    summary: isReminder ? item.title : `${item.title} (${item.contactName})`,
    description: `${isReminder ? "Reminder" : "Important Date"} for ${item.contactName}, from Memoir.`,
    start: { date: item.date },
    end: { date: addDays(item.date, 1) },
    ...(isReminder ? {} : { recurrence: ["RRULE:FREQ=YEARLY"] }),
    extendedProperties: { private: { memoirKind: item.kind, memoirId: item.id } },
  };
}

/** The text and day a Google event now says, or null when it says nothing usable. */
export function fromGoogleEvent(
  event: RemoteEvent,
  kind: MirrorKind,
  contactName: string,
): { title: string; date: string } | null {
  const summary = event.summary.trim();

  if (summary === "" || event.startDate === null) {
    return null;
  }

  const suffix = ` (${contactName})`;
  const title =
    kind === "important-date" && summary.endsWith(suffix) && summary.length > suffix.length
      ? summary.slice(0, -suffix.length).trim()
      : summary;

  return { title, date: event.startDate };
}

/** Where a user's Google Calendar connection stands, for the Settings and Calendar pages. */
export type GoogleStatus = {
  /** The app has Google credentials, so connecting is possible at all. */
  configured: boolean;
  /** The user's Google sign-in was granted calendar access. */
  linked: boolean;
  /** The Memoir calendar exists and syncing is on. */
  connected: boolean;
  /** The user's other Google calendars, each marked when it is shown on the Calendar. */
  calendars: { id: string; name: string; primary: boolean; selected: boolean }[];
  lastSyncedAt: string | null;
  lastError: string | null;
};

/** What Memoir remembers about an item it has put on Google. */
export type SyncLink = {
  kind: MirrorKind;
  itemId: string;
  eventId: string;
  /** The text and day last synced, so a change in Memoir is told apart from housekeeping. */
  title: string;
  date: string;
  /** The event's `updated` as of the last sync, so an echo of our own write is recognised. */
  remoteUpdated: number;
};

export type SyncAction =
  | { type: "create-event"; item: MirrorItem }
  | { type: "update-event"; item: MirrorItem; eventId: string }
  | { type: "delete-event"; eventId: string }
  | {
      type: "update-local";
      kind: MirrorKind;
      id: string;
      title: string;
      date: string;
      eventId: string;
      remoteUpdated: number;
    }
  | { type: "delete-local"; kind: MirrorKind; id: string; eventId: string }
  | { type: "refresh-link"; eventId: string; remoteUpdated: number }
  | { type: "drop-link"; eventId: string };

export type SyncPlanInput = {
  local: readonly MirrorItem[];
  links: readonly SyncLink[];
  /** Events Google reported: only what changed since the last sync token, or everything. */
  remote: readonly RemoteEvent[];
  /** True when `remote` is the whole calendar, so an event missing from it was deleted. */
  fullListing: boolean;
};

function keyOf(kind: MirrorKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Decides what a sync run should do to keep Memoir and its Google calendar a true
 * mirror: push new and changed items, remove events for finished or deleted ones,
 * and pull Google's edits and deletions back. Concurrent edits go to whichever
 * side changed last. Pure: the caller carries the actions out.
 */
export function planSync(input: SyncPlanInput): SyncAction[] {
  const items = new Map(input.local.map((item) => [keyOf(item.kind, item.id), item]));
  const events = new Map(input.remote.map((event) => [event.id, event]));
  const linked = new Set<string>();
  const actions: SyncAction[] = [];

  for (const link of input.links) {
    const key = keyOf(link.kind, link.itemId);
    const item = items.get(key);
    const event = events.get(link.eventId);
    const goneFromGoogle = event?.cancelled === true || (input.fullListing && event === undefined);

    linked.add(key);

    if (item === undefined || item.done) {
      actions.push(goneFromGoogle ? { type: "drop-link", eventId: link.eventId } : { type: "delete-event", eventId: link.eventId });
      continue;
    }

    if (goneFromGoogle) {
      if (item.mirror === "push-only") {
        actions.push({ type: "drop-link", eventId: link.eventId }, { type: "create-event", item });
      } else {
        actions.push({ type: "delete-local", kind: item.kind, id: item.id, eventId: link.eventId });
      }

      continue;
    }

    const localChanged = item.title !== link.title || item.date !== link.date;
    const remoteChanged = event !== undefined && event.updated > link.remoteUpdated;

    if (remoteChanged && item.mirror === "push-only") {
      actions.push({ type: "update-event", item, eventId: link.eventId });
    } else if (remoteChanged && (!localChanged || event.updated >= item.updatedAt)) {
      const read = fromGoogleEvent(event, item.kind, item.contactName);

      actions.push(
        read !== null && (read.title !== item.title || read.date !== item.date)
          ? {
              type: "update-local",
              kind: item.kind,
              id: item.id,
              title: read.title,
              date: read.date,
              eventId: link.eventId,
              remoteUpdated: event.updated,
            }
          : { type: "refresh-link", eventId: link.eventId, remoteUpdated: event.updated },
      );
    } else if (localChanged) {
      actions.push({ type: "update-event", item, eventId: link.eventId });
    }
  }

  for (const item of input.local) {
    if (!item.done && !linked.has(keyOf(item.kind, item.id))) {
      actions.push({ type: "create-event", item });
    }
  }

  return actions;
}
