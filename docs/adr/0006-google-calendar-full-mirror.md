# Google Calendar is a full two-way mirror, and a Google-side delete deletes the Memoir item

A connected Google account gets a dedicated **Memoir calendar**. Every dated Reminder and Important Date is pushed there automatically, and the two sides are kept a true mirror: a Google edit updates the item, a Google delete deletes it, and ticking a Reminder done removes its event. Concurrent edits go to whichever side changed last. Decided 2026-10-18 with the Stitch redesign.

## Considered Options

- **Full two-way mirror (chosen).** The user edits wherever they happen to be. Moving a Reminder on their phone is the whole point of having it in Google, and a mirror that ignores those edits is a mirror that lies.
- **One-way push, Memoir to Google (rejected).** Safe, because Memoir stays the only place data is destroyed, but an edit made in Google silently disagrees with Memoir from then on, and the user can't tell which copy is right.
- **Two-way with a prompt on every conflict or deletion (rejected).** Never loses data, but it turns a calendar into an inbox of questions, which is the opposite of an app for keeping in touch with minimal ceremony.
- **Per-item opt-in to sync (rejected).** One more control on every Reminder and date, and a Reminder the user forgot to opt in is one their phone never mentions.
- **Memoir items in the user's primary calendar (rejected).** It mixes Memoir's events with the user's own, so a delete on either side can't be told apart from the user tidying their calendar, and disconnecting would mean picking Memoir's events out of it. A dedicated calendar keeps the mirror's edges clear and can be hidden in one tap.

## Consequences

- **A Google-side deletion destroys the Memoir item.** Delete the "Call Bob" event on the phone and the Reminder is gone from Memoir, with no undo. This is the accepted cost of a true mirror: the alternative is the one-way push above, and the two states can't both hold. Disconnecting is the one way to stop it: the Memoir calendar and its events stay in Google, and nothing more is deleted on either side. Connecting again reuses that calendar and clears only the events Memoir itself made in it before pushing everything afresh, so they are not doubled; events the user added are left alone.
- **Last write wins.** When both sides changed the same item since the last sync, the later edit is kept. A change counts as a change in Memoir only when its text or day differs from what was last synced, so the reminder engine moving a Reminder from due to overdue is not an edit that could overwrite a real Google one.
- **Birthdays are the exception.** A birthday is derived from the Contact's `birthday`, so letting Google rename or delete it would leave the two out of step. It is pushed one way: a Google edit is put back, and a Google delete recreates the event. Other Important Dates are fully mirrored, as yearly events.
- **A done Reminder has no event.** Ticking one off removes its event; it is not recreated. A Google edit to a Reminder sets it back to pending, and the reminder engine then works out whether it is due or overdue.
- **Sync runs when something changes, not on a timer.** It runs after a Reminder, Important Date or Contact changes, when the Calendar opens with a sync older than two minutes, and on request. The redesign's plan was a scheduled Durable Object alarm, as [ADR 0003](0003-durable-object-alarm-reminders.md) does for Reminders; this decision defers it. A Google edit appears in Memoir the next time one of those happens. A per-user alarm can be added later without changing the mirror's rules.
- **One run per user at a time.** A run takes a 60 second lease on the connection; a second request while it runs asks it to go round again, so nothing is pushed twice. Only the run that took a lease releases it.
- **Google is reached through one thin module** (`worker/lib/google/client.ts`). Tests replace it with an in-memory fake, so the sync rules are tested without the network. The real HTTP client is tested only by running it against Google.
- **Tokens stay in the `accounts` table**, where Better Auth keeps them, and Memoir refreshes the access token itself. Calendar access needs a refresh token, so the Google OAuth client asks for offline access and consent, which also applies to a plain Google sign-in.
- **The Google layer is read live**, never copied into Memoir, and is read-only. Only the Memoir calendar is synced.
- **Known gaps:** renaming a Contact does not update the titles of their Important Date events, because the sync only sees an Important Date's own text and day; and a failure between creating an event and recording it can leave a duplicate event in Google that Memoir no longer tracks.
