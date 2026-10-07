# All-in on Cloudflare: Workers + D1 instead of Postgres

Memoir runs entirely on Cloudflare — one Workers app (via the Cloudflare Vite plugin) with D1 (SQLite), KV, and Durable Objects, on the Free tier. Decided 2026-10-07. The alternative was a hybrid: Cloudflare hosting with an external Postgres (Neon/Turso/Supabase).

## Considered Options

- **All-in Cloudflare (chosen).** Zero external infra, $0 cost, one deploy target, and the CF-native stack is itself a portfolio differentiator. D1 has FTS5 built in, covering search.
- **External Postgres.** More familiar, richer SQL, but adds a second vendor, a second billing system, and network hops to every query.

## Consequences

- **Free-tier constraints are design inputs:** 10 ms CPU per request, 5M D1 row reads and 100K row writes per day, 1K KV writes per day. See ADR-0002 for the hashing consequence.
- **SQLite semantics:** D1 is SQLite, not Postgres. JSON columns store custom fields; migrations go through Drizzle against D1.
- **Escape hatch is known and cheap:** Workers Paid ($5/month) lifts the CPU cap and daily limits with no architecture change.
