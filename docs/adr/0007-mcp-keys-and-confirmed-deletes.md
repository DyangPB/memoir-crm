# MCP access: hashed API keys, tools through /api, deletes confirmed or refused

`/mcp` serves AI assistants over streamable HTTP. Each request is authenticated by a per-user API key, every tool runs through Memoir's own `/api` routes as that user, and the delete tools only act on a confirmation the user gives through their client. Decided 2026-10-19.

## Considered Options

- **Keys stored as a plain SHA-256 hash (chosen).** A key is 256 random bits shown once as `mem_...`, so a fast unsalted hash is enough to keep it unrecoverable from the database. PBKDF2 (ADR-0002) is for low-entropy passwords; running it on every `/mcp` request would only burn the 10 ms CPU cap.
- **Tools dispatch to the `/api` routes in-process (chosen).** The route handlers hold the validation and ownership checks, so tools call them with a request registered as acting for the key's owner (a `WeakMap` keyed on the `Request`, in `worker/lib/session.ts`). Nothing outside the Worker can name that map, and an API key is never accepted as a credential on `/api` itself, so a leaked key cannot create keys or delete the account.
- **Re-implementing each tool against the database (rejected).** It would duplicate the validation in every route and let the two drift apart.
- **Letting an API key authenticate `/api` directly (rejected).** One mechanism, but it hands a key the whole API, including account deletion and key management.

## Deletes

Delete tools never run on the assistant's word alone. They return an `input_required` result asking the user, and carry on only when the retried call carries an accepted `confirm: true`. A "no", a dismissed prompt, or a client that cannot be asked leaves the data untouched.

The stateless handler (`createMcpHandler`) can only ask this way, which needs a client on the 2026-07-28 protocol. The older pushed `elicitation/create` needs a session the server keeps between requests, which means a Durable Object per session. We chose not to build that yet, so assistants on the older protocol get a clear refusal and the user deletes in the app.

## Consequences

- Revoking a key deletes its row, and every request looks the key up, so revocation is immediate.
- Supporting older clients later means adding a session-backed legacy handler (`createLegacyMcpHandler` with `WorkerTransport` and Durable Object storage) beside the stateless one and routing by protocol generation; the tools and the confirmation rule stay as they are.
- `agents`, `@modelcontextprotocol/server` and `@modelcontextprotocol/client` are pinned together; take their upgrades as one change.
