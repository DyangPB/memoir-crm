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

## Deploy

Deploy runs from CI on every push to `main`, and locally with `pnpm deploy`. Both need a
Cloudflare account with a D1 database named `memoir`:

- set `CLOUDFLARE_API_TOKEN` (Workers + D1 edit) as a repository secret for CI
- replace the placeholder `database_id` in `apps/web/wrangler.jsonc` with the real one
- apply migrations with `wrangler d1 migrations apply memoir --remote` (from `apps/web`)

## Regenerating types

`apps/web/worker-configuration.d.ts` is generated from `wrangler.jsonc`. After changing
bindings or the compatibility date, run `pnpm --filter @memoir/web cf-typegen`.
