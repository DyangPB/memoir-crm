# The app home is a dashboard, not the contact list

`/app` opens on a dashboard that answers "what needs me now": Reminders due and overdue, Important Dates coming up within 30 days, and Contacts you have not talked to in a while. The contact list moves to `/app/contacts`, where search and label filters live. Decided 2026-10-12 from the iteration 1 feedback, superseding spec story 37 and decision-log row 22 in [docs/architecture.md](../architecture.md).

## Considered Options

- **Dashboard at `/app`, list at `/app/contacts` (chosen).** The Reminders page already answers due, overdue, upcoming and birthdays this week, so a home surface only earns its place by adding what that page cannot show. Which contacts have gone quiet is that something, and it is already the app's own signal: the days-since numeral.
- **Redirect `/app` to `/app/reminders` (rejected).** Reminders becomes the landing page and no dashboard exists. Simplest, but it makes the dedicated page redundant with the home surface and drops the relationship signal entirely.
- **A dashboard band above the contact list (rejected).** Least disruptive, but `/app` becomes a long stacked page, the same shape the feedback complained about on contact detail.

## Consequences

- The app has five surfaces under one shared header: Dashboard (`/app`), Contacts (`/app/contacts`), Reminders (`/app/reminders`), Calendar (`/app/calendar`), Settings (`/app/settings`). Calendar arrived with the Stitch redesign.
- The back control on contact pages points at `/app/contacts`, and the Reminders page's "Back to your people" copy retires with the list-first home.
- The dashboard derives everything in the browser from `/api/contacts`, `/api/reminders` and `/api/important-dates`. There is no aggregate endpoint: the ranking and recurrence logic already exists as tested pure functions in `packages/core`, and a server-side composition would duplicate it. The one exception is the "On this day" strip: Interactions are in none of those three endpoints, and shipping every Interaction to the browser to find one would be wasteful, so `GET /api/interactions/on-this-day?date=` filters server-side (the client sends its local day) and still picks the memory with the pure `pickOnThisDay` in `packages/core`.
- `design.md`'s desktop master-detail rail (a 360px list rail beside the detail pane) is not implemented and is not planned: it addresses the cost of switching between contacts, not the detail page's scroll cost, and it would need a layout route the client does not have. `design.md`'s Layout section now describes the two-pane detail page instead.
- Calendar is the second exception to "no aggregate endpoint": `GET /api/calendar?from=&to=` returns Reminders and Important Dates for a range (and, for a connected user, events from the Google calendars they chose), each tagged by kind, because expanding yearly Important Dates into a range and bounding the Reminders query by date belong next to the data. The expansion and grouping are still pure functions in `packages/core` (`expandImportantDates`, `groupItemsByDay`), and the client sends the range its view needs.
