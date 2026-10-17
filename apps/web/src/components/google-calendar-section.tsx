import { GOOGLE_CALENDAR_SCOPE, type GoogleStatus } from "@memoir/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import {
  connectGoogle,
  disconnectGoogle,
  getGoogleStatus,
  setGoogleCalendars,
  syncGoogleNow,
} from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatAgo } from "../lib/format";
import { Button } from "./ui/button";

const RETURN_FLAG = "google";

export function GoogleCalendarSection() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [needsAuthorize, setNeedsAuthorize] = useState(false);
  const [params, setParams] = useSearchParams();
  const returningFromGoogle = params.get(RETURN_FLAG) === "linked";

  useEffect(() => {
    let active = true;

    void getGoogleStatus().then(async (result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setError(result.message);

        return;
      }

      setStatus(result.value);

      // Back from Google's consent screen: finish setting up without another click.
      // Only then: after a Disconnect the user is already linked, and stays disconnected.
      if (returningFromGoogle && result.value.linked && !result.value.connected) {
        setBusy(true);

        const connected = await connectGoogle();

        if (!active) {
          return;
        }

        setBusy(false);
        setParams({}, { replace: true });

        if (connected.ok) {
          setStatus(connected.value);
        } else {
          setError(connected.message);
          setNeedsAuthorize(true);
        }
      }
    });

    return () => {
      active = false;
    };
    // The return trip from Google is read once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: () => Promise<{ ok: true; value: GoogleStatus } | { ok: false; message: string }>) {
    setBusy(true);
    setError(null);

    const result = await action();

    setBusy(false);

    if (result.ok) {
      setStatus(result.value);
    } else {
      setError(result.message);
    }
  }

  async function handleLink() {
    setBusy(true);
    setError(null);

    const result = await authClient.linkSocial({
      provider: "google",
      scopes: [GOOGLE_CALENDAR_SCOPE],
      callbackURL: `/app/settings?${RETURN_FLAG}=linked`,
    });

    if (result.error) {
      setBusy(false);
      setError(result.error.message ?? "Google didn't open. Try again.");
    }
  }

  /** Already linked: just turn syncing on. Otherwise send the user to Google first. */
  async function handleConnect() {
    if (status?.linked !== true) {
      await handleLink();

      return;
    }

    setBusy(true);
    setError(null);

    const result = await connectGoogle();

    setBusy(false);

    if (result.ok) {
      setStatus(result.value);
      setNeedsAuthorize(false);
    } else {
      setError(result.message);
      setNeedsAuthorize(true);
    }
  }

  async function handleToggle(calendarId: string) {
    if (status === null) {
      return;
    }

    const chosen = status.calendars
      .filter((calendar) => (calendar.id === calendarId ? !calendar.selected : calendar.selected))
      .map((calendar) => calendar.id);

    await run(() => setGoogleCalendars(chosen));
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);

    const result = await disconnectGoogle();

    setBusy(false);
    setConfirmingDisconnect(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    const refreshed = await getGoogleStatus();

    if (refreshed.ok) {
      setStatus(refreshed.value);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-4 shadow-card sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-headline-sm text-ink">Google Calendar</h2>
        <p className="text-body-md text-ink-mute">
          Keep your Reminders and Important Dates on your phone, and see your Google events beside
          them. Memoir adds its own calendar to your Google account and mirrors it both ways.
        </p>
      </div>

      {error !== null && (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
          {error}
        </p>
      )}

      {status === null ? (
        error === null && <p className="text-body-md text-ink-mute">Checking Google Calendar.</p>
      ) : !status.configured ? (
        <p className="text-body-md text-ink-mute">
          Google Calendar isn't set up on this Memoir yet. Whoever runs it needs to add Google sign-in
          credentials first.
        </p>
      ) : !status.connected ? (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={busy} onClick={() => void handleConnect()}>
              {busy ? "Connecting" : "Connect Google Calendar"}
            </Button>
            {needsAuthorize && (
              <Button disabled={busy} onClick={() => void handleLink()} variant="secondary">
                Allow access again
              </Button>
            )}
          </div>
          <p className="text-caption text-ink-mute">
            Google will ask you to let Memoir see and edit your calendars.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body-md text-ink-secondary">
              {status.lastSyncedAt === null
                ? "Not synced yet"
                : `Synced · ${formatAgo(status.lastSyncedAt, new Date())}`}
            </span>
            <Button disabled={busy} onClick={() => void run(syncGoogleNow)} variant="secondary">
              {busy ? "Syncing" : "Sync now"}
            </Button>
          </div>

          {status.lastError !== null && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-md bg-danger-bg px-3 py-2 text-caption text-danger" role="alert">
                {status.lastError}
              </p>
              {status.lastError.includes("again") && (
                <Button disabled={busy} onClick={() => void handleLink()} variant="secondary">
                  Allow access again
                </Button>
              )}
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-caption text-ink-mute">Show these Google calendars on the Calendar</legend>
            {status.calendars.map((calendar) => (
              <label className="flex items-center gap-2 text-body-md text-ink-secondary" key={calendar.id}>
                <input
                  checked={calendar.selected}
                  className="size-4 accent-primary"
                  disabled={busy}
                  onChange={() => void handleToggle(calendar.id)}
                  type="checkbox"
                />
                {calendar.name}
                {calendar.primary && <span className="text-caption text-ink-mute">(main)</span>}
              </label>
            ))}
          </fieldset>

          {confirmingDisconnect ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-caption text-ink-mute">
                Stop syncing? The Memoir calendar and its events stay in your Google account.
              </span>
              <Button disabled={busy} onClick={() => void handleDisconnect()} variant="danger">
                Disconnect
              </Button>
              <Button onClick={() => setConfirmingDisconnect(false)} variant="ghost">
                Keep it
              </Button>
            </div>
          ) : (
            <div>
              <Button onClick={() => setConfirmingDisconnect(true)} variant="ghost">
                Disconnect Google Calendar
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
