# PBKDF2 via WebCrypto for password hashing, not argon2/bcrypt

Passwords are hashed with PBKDF2 through the WebCrypto `crypto.subtle` API (configured as Better Auth's custom password hasher), instead of the default scrypt or the usual argon2/bcrypt recommendations. Decided 2026-10-07.

## Why this looks wrong

The standard advice in 2026 is argon2id or bcrypt. A future reader will wonder why this app "downgraded" to PBKDF2.

## Why it's deliberate

The app runs on the Cloudflare Workers Free tier, which caps CPU at **10 ms per request**. Verified against Cloudflare's docs: `argon2` is not available in the Workers `node:crypto` runtime at all; bcrypt runs as pure JS/WASM and would blow the CPU budget; WebCrypto PBKDF2 is native and fast, and Cloudflare's own docs recommend WebCrypto for CPU-intensive crypto. PBKDF2 with a high iteration count (tuned to the budget) is the strongest hashing that fits the runtime.

## Consequences

- Iteration count must be benchmarked against the 10 ms cap and revisited if the app moves to Workers Paid ($5/month), where scrypt becomes affordable.
- The hasher is isolated behind Better Auth's hashing interface, so swapping it later is a config change, not a migration.
