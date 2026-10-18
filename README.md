# Memoir

A personal CRM for the people who matter. Private per-user data, a timeline of Interactions, Reminders, Notes, Labels, and Custom Fields, deployed as one Cloudflare Workers app.

- Vocabulary: [`GLOSSARY.md`](GLOSSARY.md)
- Design language: [`design.md`](design.md)
- Architecture and decisions: [`docs/architecture.md`](docs/architecture.md)
- MVP spec: [`docs/specs/0001-memoir-mvp.md`](docs/specs/0001-memoir-mvp.md)

## Layout

```
apps/web        React + Vite client, the Hono API, and the Worker entry (one deploy)
packages/core   domain types and pure logic
packages/db     Drizzle schema and D1 migrations
```

## Development

```sh
pnpm install
pnpm dev        # Vite dev server with the Worker + D1 running locally
pnpm test       # Vitest (Workers runtime) + core unit tests
pnpm typecheck
pnpm build
```

## Connect an AI assistant

Memoir runs an MCP server at `/mcp` (streamable HTTP). In **Settings → Assistant access**, create an API key, copy it (it is shown once), and add `https://<your-memoir>/mcp` to your assistant as an MCP server and give it the key.

Tools: `list_contacts`, `get_contact` (with Timeline and Notes), `create_contact`, `update_contact`, `log_interaction`, `add_note`, `add_reminder`, and the deletes `delete_contact`, `delete_interaction`, `delete_note`, `delete_reminder`. Deletes ask you to confirm through the assistant and do nothing otherwise; assistants on older MCP protocol versions can't be asked, so they are refused. See [ADR-0007](docs/adr/0007-mcp-keys-and-confirmed-deletes.md).

## Deploy

Live at <https://memoir.shadypb.workers.dev>. Deploy locally with `pnpm deploy`, and from
CI on every push to `main` (needs a `CLOUDFLARE_API_TOKEN` repository secret with Workers
and D1 edit permissions).

The `memoir` D1 database is already provisioned and bound in `apps/web/wrangler.jsonc`.
CI applies pending migrations before every deploy, after printing a D1 Time Travel
bookmark in the log to restore from. Keep migrations additive (add columns and tables;
drop or rename only in a later release) so the code still live keeps working while they
apply. Locally, apply them with `wrangler d1 migrations apply DB --local` from `apps/web`.

Contact photos and Interaction attachments live in an R2 bucket, `memoir-media`, bound as
`MEDIA`. Create it once with `wrangler r2 bucket create memoir-media` before the first
deploy that includes it; CI does not create it. Google Calendar sync is optional and needs
the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets (`wrangler secret put`).

## Regenerating types

`apps/web/worker-configuration.d.ts` is generated from `wrangler.jsonc`. After changing
bindings or the compatibility date, run `pnpm --filter @memoir/web cf-typegen`.
