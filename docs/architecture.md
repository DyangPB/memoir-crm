# Memoir — Architecture & Decisions

A personal CRM: private per-user accounts, warm-paper identity, all-in on Cloudflare's free tier. Every decision below was made in an interview session on 2026-10-07; the glossary is the canonical vocabulary ([GLOSSARY.md](../GLOSSARY.md)), the design language lives in [design.md](../design.md), and the platform research backing the Cloudflare choices is in [docs/research/personal-crm.md](research/personal-crm.md).

## Stack

- **Deploy**: one Workers app via the Cloudflare Vite plugin (static assets + `/api` + `/mcp` in a single deploy), Free tier
- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui, TanStack Query
- **API**: Hono on Workers
- **Data**: D1 (SQLite) via Drizzle; FTS5 for full-text search; JSON columns for custom field values
- **Auth**: Better Auth (email/password + Google OAuth), PBKDF2/WebCrypto hashing, sessions in D1
- **Google Calendar**: optional two-way sync through the same Google OAuth client, asked for with the `calendar` scope and offline access (a refresh token, kept in the `accounts` table). Memoir adds a "Memoir" calendar to the user's Google account and mirrors Reminders and Important Dates there; `/api/google/*` connects, picks display calendars, and syncs. Sync runs when a Reminder or date changes, when the Calendar opens, and on request; there is no background job. All Google access sits behind `worker/lib/google/client.ts`, which tests replace with a fake.
- **Reminders**: per-user Durable Object alarms
- **MCP server**: streamable HTTP on `/mcp`, per-user API keys, destructive tools gated by MCP elicitation
- **Repo**: pnpm monorepo — `apps/web`, `packages/core`, `packages/db`; GitHub Actions (Vitest + miniflare, then `wrangler deploy`)

## Route map

| Route | Surface |
|---|---|
| `/` | Landing: product-first hero ("A memoir of everyone you know."), contact-sheet composite, "Try the demo" |
| `/login` · `/signup` | Auth (plus Better Auth's `/api/auth/*`) |
| `/app` | Dashboard: Reminders due and overdue, Important Dates coming up, Contacts slipping |
| `/app/contacts` | Contacts split view: list rail (search + label filters, days-since) beside a detail pane; on mobile the list fills the screen (moved off `/app`, see ADR-0004) |
| `/app/contacts/:id` | Same split view with that Contact selected, rendered as a child route of `/app/contacts`: timeline thread and Notes in the main column, reference sidebar (facts, custom fields, labels, Important Dates); on mobile the detail replaces the list, with a Back link |
| `/app/reminders` | Reminder monitor: due, overdue, upcoming, birthdays this week |
| `/app/settings` | Profile, MCP API keys, custom fields, labels, danger zone |
| `/mcp` | MCP streamable-HTTP endpoint (same Worker) |

Label filtering is a `?label=` query parameter on `/app/contacts`, carried onto `/app/contacts/:id` and the mobile Back link so the filter survives selection; labels have no dedicated pages.

## Data model (D1)

- `users` — account, credentials, session data
- `contacts` — minimal built-in columns (name, avatar, emails, phones, social links, birthday, how-you-met) + `custom_fields` JSON
- `field_definitions` — per-user custom field schema (name, type, select options)
- `interactions` — typed, dated timeline entries (call, meeting, message, other) hanging off a contact
- `notes` — freeform captured info per contact
- `reminders` — one-off dated prompts per contact; `important_dates` — yearly recurring dates (birthdays)
- `labels` + `contact_labels` — flat, per-user organization
- `mcp_keys` — per-user API keys for the MCP server
- FTS5 virtual table over contact names, notes, and interactions

Every row except `users` is scoped by `user_id` — that column is the entire multi-tenant isolation model (ADR in reverse: no vaults, no teams, no permissions).

## Reminder engine

One Durable Object per user holds the due-event schedule. Its single alarm points at the next due event; firing marks due reminders and reschedules. Birthdays roll forward a year. See ADR-0003.

## Decision log

| # | Decision | Choice |
|---|---|---|
| 1 | Multi-user model | Private per-user accounts, no sharing |
| 2 | MVP scope | Consensus core + custom fields |
| 3/12 | Deployment | All-in Cloudflare; single Workers app via Vite plugin |
| 4 | Auth | Better Auth: email/password + Google OAuth |
| 5/11 | Differentiator | MCP server, full CRUD, deletes gated by elicitation |
| 6 | Definition of done | Live URL + demo account, tests + CI, write-up |
| 7 | Contact schema | Minimal built-in; rest via custom fields |
| 8 | Timeline vs notes | Separate Interaction + Note |
| 9 | Reminders | In-app only; Reminder + Important Date |
| 10 | Organization | Flat labels |
| 13 | Budget | Free tier, $0; 10 ms CPU cap accepted |
| 14 | Reminder engine | Per-user DO alarms |
| 15 | Custom field types | text, number, date, single/multi-select, long text, boolean, URL |
| 16 | UI | Tailwind + shadcn/ui |
| 17 | Repo/CI | pnpm monorepo + GitHub Actions |
| 18 | Access | Open signup + one-click demo with seed data |
| 19 | Name | Memoir (MemoIR CRM exists in a different niche) |
| 20 | Docs | README + ADRs + architecture doc |
| 21 | Visual identity | Warm paper + ocean blue; Newsreader + Inter; airmail edge |
| 22 | App home | List-first with reminders strip (superseded by 27) |
| 23 | Landing | Product-first hero |
| 24 | Voice | Warm letter |
| 25 | Hero headline | "A memoir of everyone you know." |
| 26 | Routes | `/app` shell; dedicated `/app/reminders` |
| 27 | App home (revisited) | Dashboard at `/app`; contact list at `/app/contacts` (ADR-0004) |
| 28 | Form controls | Radix primitives + `react-day-picker`, styled with design.md tokens |

## ADRs

- [0001 — All-in Cloudflare](adr/0001-cloudflare-all-in.md)
- [0002 — PBKDF2 hashing](adr/0002-pbkdf2-password-hashing.md)
- [0003 — DO alarm reminders](adr/0003-durable-object-alarm-reminders.md)
- [0004 — Dashboard home](adr/0004-dashboard-home.md)
- [0005 — Demo account](adr/0005-demo-account.md)
