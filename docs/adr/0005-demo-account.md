# The demo account is one shared account, reseeded on every visit

"Try the demo" signs the visitor into a single regular account, `demo@memoir.example`, and rewrites its address book from a fixed seed on every click. Decided 2026-10-14.

## Considered Options

- **One shared account, reseeded on every visit (chosen).** Every visitor lands on the same curated address book, in the same state, and never on a previous visitor's edits. The seed is deterministic and date-relative, so the Dashboard always has due Reminders, Coming up Important Dates, and contacts who have gone quiet. The cost is roughly 70 D1 writes per click.
- **One shared account, seeded once (rejected).** Cheaper, but the address book decays: a visitor who deletes a contact or ticks off a Reminder leaves a demo that no longer shows every surface, and the next visitor inherits it.
- **A fresh account per visitor (rejected).** No shared state, but it grows unbounded rows on a free-tier database, and the demo stops being one fixed account that tests and screenshots can rely on.

## Consequences

- The seed lives in `packages/core` as `buildDemoSeed(now)`, a pure function returning Contacts, Interactions, Notes, Labels, Field Definitions, Reminders, and Important Dates with dates relative to `now`. `apps/web/worker/lib/demo.ts` owns the D1 writes: one cascading delete and the inserts run in a single D1 batch, so a visitor never sees a half-written address book. It re-arms the user's reminder engine afterwards.
- The same seed is the test fixture set. `packages/core/test/demo.test.ts` checks every row against the same parsers the API uses, and `apps/web/test/demo.test.ts` drives the demo through the HTTP API.
- The account is a regular account (`/api/auth/sign-in/email` with the demo credentials works) rather than a special auth path, so nothing about sessions or scoping is demo-specific. The credentials are published: `demo@memoir.example` / `memoir-demo-1`.
- `POST /api/demo` is unauthenticated and writes on every call: the seed's inserts plus the delete of the account's previous rows and the rows that cascade from it, roughly 145 rows. The free tier's daily D1 write budget is the ceiling: the route answers 503 when the write fails, and no paid plan is involved.
- Sessions accumulate, one row per click, expiring on Better Auth's default schedule.
- Two visitors in the demo at once share the account, and one clicking "Try the demo" resets it under the other. That is the accepted cost of one shared, always-curated demo.
