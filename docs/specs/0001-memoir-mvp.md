# Spec: Memoir MVP — personal CRM

## Problem Statement

People lose track of the people who matter. They forget birthdays, can't remember when they last spoke to someone, and have no single place for the small details that make relationships work — how they met, gift ideas, the names of someone's kids. Sales CRMs are built for pipelines, not for friends. The user wants a personal CRM: a private address book of people, with a timeline of interactions, reminders, notes, and labels. It must be usable by many people (each with strictly private data), deploy entirely on Cloudflare's free tier, and double as a portfolio piece: clean architecture, tests, docs, and an MCP server as the differentiator.

## Solution

**Memoir** is a web app where each user keeps a private set of Contacts. Every contact carries rich detail (custom fields), a chronological Timeline of typed Interactions, freeform Notes, flat Labels, and Reminders — one-off prompts plus yearly recurring Important Dates such as birthdays. The app opens on a list-first home with a reminders strip, a dedicated reminders page, and a contact detail page built around a timeline thread. Full-text search (D1 FTS5) and label filters make people findable. An MCP server lets AI assistants read contacts and log interactions on the user's behalf, with destructive operations gated by client-side confirmation. Sign-in is email/password plus Google OAuth. There is open signup and a one-click demo account pre-seeded with fictional data. The whole app deploys as one Cloudflare Workers app (Vite plugin) with D1 and per-user Durable Objects for the reminder engine, on the free tier.

## User Stories

1. As a visitor, I want a landing page that explains what Memoir is, so that I can decide whether to try it.
2. As a visitor, I want the landing hero to show the actual product (contact list and timeline), so that I see what Memoir does immediately.
3. As a visitor, I want to click "Try the demo", so that I can explore a populated app without creating an account.
4. As a visitor, I want to create an account with email and password, so that I can keep my own private address book.
5. As a visitor, I want to sign up with Google, so that I can start without inventing another password.
6. As a user, I want to sign in with email and password, so that I can get back to my data.
7. As a user, I want to sign in with Google, so that I can get back quickly.
8. As a user, I want to sign out, so that my data is not reachable from this device.
9. As a user, I want my session to persist across visits, so that I don't sign in every time.
10. As a user, I want my data to be strictly private to me, so that I can keep personal details in Memoir without exposure to other users.
11. As a user, I want to add a contact with their name and basic details, so that I can start tracking the relationship.
12. As a user, I want to edit a contact's details, so that my records stay current.
13. As a user, I want to remove a contact behind a clear confirmation, so that I never delete someone by accident.
14. As a user, I want to see a contact's rich detail (emails, phones, social links, birthday, how we met), so that everything I know is in one place.
15. As a user, I want to see all my contacts in one list, so that I can find people quickly.
16. As a user, I want to search contacts by name or note text, so that I can find someone fast.
17. As a user, I want to filter the contact list by label, so that I can see just one group of people.
18. As a user, I want to define custom fields on my contacts (for example "Gift ideas" as long text, "Family" as multi-select), so that I can track what matters to me.
19. As a user, I want custom fields to support text, number, date, single-select, multi-select, long text, boolean, and URL types, so that they fit the information I actually have.
20. As a user, I want to set the options of select fields, so that my choices stay consistent.
21. As a user, I want to fill in custom fields per contact, so that the details are captured.
22. As a user, I want invalid custom-field values rejected with a clear message, so that my data stays clean.
23. As a user, I want to delete a field definition knowing its values will be removed, so that my schema does not grow stale.
24. As a user, I want to log an interaction (call, meeting, message, other) with a date and a note, so that I have a record of when we last spoke.
25. As a user, I want to see a contact's timeline as a chronological thread, so that I can review the history of the relationship.
26. As a user, I want to edit or delete an interaction, so that mistakes can be fixed.
27. As a user, I want to see "days since we talked" on each contact, so that I know who needs attention.
28. As a user, I want to add freeform notes to a contact, so that I can keep the "what should I remember" details.
29. As a user, I want to edit and delete notes, so that they stay accurate.
30. As a user, I want to create, rename, and delete labels, so that my organization matches my life.
31. As a user, I want to apply multiple labels to one contact, so that a person can belong to several groups at once.
32. As a user, I want to create a reminder for a contact ("call Bob by October 20"), so that I follow through on reaching out.
33. As a user, I want to tick a reminder off, so that it is done.
34. As a user, I want reminders to become overdue when their date passes, so that I see what slipped.
35. As a user, I want important dates (birthdays, anniversaries) to recur yearly, so that I am reminded every year.
36. As a user, I want a contact's birthday to feed their important dates automatically, so that I don't enter it twice.
37. As a user, I want to see due and upcoming reminders in a strip on my home screen, so that I notice them without navigating.
38. As a user, I want a dedicated reminders page showing due, overdue, upcoming, and birthdays this week, so that I can plan my reach-outs.
39. As a user, I want reminders to change state even while I'm not using the app, so that everything is correct when I return.
40. As a user, I want to manage my profile in settings, so that my account is mine.
41. As a user, I want to generate and revoke MCP API keys in settings, so that I control which assistants can touch my data.
42. As a user, I want to manage my custom fields and labels in settings, so that I can curate my schema.
43. As a user, I want to delete my account behind a confirmation, so that I can leave and take my data with me.
44. As an AI assistant user, I want to connect an assistant to Memoir with an API key, so that it can help with my relationships.
45. As an AI assistant, I want to list and search the user's contacts, so that I can answer questions about who they know.
46. As an AI assistant, I want to read a contact's timeline and notes, so that I can summarize a relationship.
47. As an AI assistant, I want to log an interaction, add a note, and add a reminder, so that the user can delegate the bookkeeping ("log that I had coffee with Bob").
48. As an AI assistant, I want to create and update contacts, so that I can keep the address book current.
49. As a user, I want destructive MCP operations (deletes) to prompt me for confirmation, so that an assistant cannot silently remove my data.
50. As a user, I want a revoked key to stop working immediately, so that a leaked key is harmless.
51. As a demo user, I want a populated account (fictional contacts, interactions, reminders), so that I can see the product working.

## Implementation Decisions

- **Monorepo (pnpm workspaces)**: `apps/web` (React + Vite, Tailwind + shadcn/ui, TanStack Query), `packages/core` (domain types, validation, pure logic), `packages/db` (Drizzle schema and migrations shared by the app and tests).
- **Deploy shape**: one Workers app via the Cloudflare Vite plugin — static assets, Hono API, and the MCP endpoint in a single deploy. Free tier; the 10 ms CPU cap is a design input everywhere.
- **Data model (D1)**: `users`, `contacts` (minimal built-in columns plus a `custom_fields` JSON column), `field_definitions`, `interactions`, `notes`, `reminders`, `important_dates`, `labels`, `contact_labels`, `mcp_keys`. Every user-owned row is scoped by `user_id` — that column is the entire multi-user isolation model. Full-text search via an FTS5 virtual table kept in sync by triggers over contact names, notes, and interactions.
- **Auth**: Better Auth with email/password and Google OAuth, sessions stored in D1. Password hashing is PBKDF2 through WebCrypto, wired in as Better Auth's custom hasher (see ADR-0002). No email sending in v1, so no email verification and no email-based password reset.
- **Reminder engine**: one Durable Object per user holding that user's due-event schedule; its single alarm always points at the next due event, marks due reminders on firing, and reschedules. Important Dates roll forward one year on firing (see ADR-0003).
- **Custom fields**: a per-user `field_definitions` table (name, type, options for selects) plus values in the contact's JSON column. Validation lives in `packages/core` as a table-driven module keyed by the eight field types. Deleting a field definition removes its values from all contacts, with a warning in the UI.
- **MCP server**: streamable HTTP at `/mcp`, authenticated by per-user API keys (hashed at rest). Tool set: list and search contacts, get a contact with timeline and notes, log an interaction, add a note, add a reminder, create and update a contact, plus delete tools. Destructive tools are marked in the MCP schema as requiring elicitation, so the MCP client prompts the user for confirmation before the call proceeds.
- **Contact deletion** uses a confirmation dialog restating the action (per `design.md` surface copy), not undo.
- **Demo account**: a regular account seeded with deterministic fictional contacts, interactions, and reminders. The same seed data doubles as test fixtures.
- **Landing**: product-first hero per `design.md` — headline "A memoir of everyone you know.", subline "A personal CRM for the people who matter.", contact-sheet composite beside it, one "Try the demo" primary pill.
- **CI (GitHub Actions)**: Vitest (with miniflare) plus typecheck on every push and PR; `wrangler deploy` on merge to `main`.
- **Platform constraints are design inputs**: 100K requests/day, 5M D1 reads and 100K D1 writes per day, 10 ms CPU per request on the free tier. Requests are kept lean; password hashing, JSON handling, and the alarm sweep all fit the CPU budget.

## Testing Decisions

- **Primary seam: the HTTP API.** Integration tests run against the real routes in Vitest + miniflare with real D1 (migrations applied) and real Durable Objects. Tests assert on request/response pairs and observable database state, never on internal function calls. Auth flows, app API, and the MCP server (driven through an MCP client over the same seam) all test through this seam. The reminder engine is tested by triggering the per-user DO's alarm in miniflare and asserting the due/overdue transitions and yearly roll-forward.
- **Secondary seam: pure logic in `packages/core`.** Custom-field validation, reminder schedule math (next-due computation, yearly roll-forward, overdue classification), and days-since computation are unit-tested directly as pure functions with no IO.
- **What makes a good test**: it asserts external behavior (what the user or an MCP client can observe), not implementation details. No tests of internal Worker wiring; no implementation-internal snapshots. Use realistic data extremes: long names, many labels, empty timelines, overdue and not-yet-due reminders.
- **Prior art**: greenfield repo, no existing tests. Follow standard Vitest + miniflare patterns; the demo seed data is the shared fixture set.

## Out of Scope

- Email of any kind: reminder emails, daily digests, email verification, email-based password reset (no email provider in v1)
- CSV/vCard import and export; contact-to-contact relationships
- Shared vaults, teams, permissions, or any cross-user visibility
- Passkeys (WebAuthn); i18n (English only); photo and file uploads (letter avatars in v1; no R2)
- Semantic search (Vectorize) and any AI enrichment beyond the MCP server
- Workers Paid tier and billing
- Offline/PWA behavior and mobile apps
- Blog post and video walkthrough (the documentation deliverable is README + ADRs + architecture doc)

## Further Notes

- **Vocabulary**: use the `GLOSSARY.md` terms exactly — Contact, Interaction, Note, Reminder, Important Date, Label, Custom Field, Field Definition — never their avoided synonyms.
- **Design authority**: `design.md` defines the palette (ocean `#0e5f82`, warm paper, amber for reminders only), type system (Fraunces display, Inter UI), signature components (airmail edge, timeline thread, days-since numeral), and the warm-letter voice with per-surface copy.
- **ADRs**: 0001 (all-in Cloudflare, free tier), 0002 (PBKDF2 hashing), 0003 (per-user DO alarm reminders) constrain this work; any contradiction must be surfaced, not silently overridden.
- **Name**: the product is Memoir. A "MemoIR CRM" exists in a different niche (investor relations); no action needed, noted for the write-up.
