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

Live at <https://memoir.shadypb.workers.dev>. Deploy locally with `pnpm deploy`, and from
CI on every push to `main` (needs a `CLOUDFLARE_API_TOKEN` repository secret with Workers
and D1 edit permissions).

The `memoir` D1 database is already provisioned and bound in `apps/web/wrangler.jsonc`.
Apply schema changes with `wrangler d1 migrations apply memoir --remote` from `apps/web`.

## Regenerating types

`apps/web/worker-configuration.d.ts` is generated from `wrangler.jsonc`. After changing
bindings or the compatibility date, run `pnpm --filter @memoir/web cf-typegen`.
