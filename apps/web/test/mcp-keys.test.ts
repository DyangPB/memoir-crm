import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";

type McpKeySummary = { id: string; name: string; prefix: string; createdAt: string };

async function api(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method,
    headers: {
      origin: ORIGIN,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie !== undefined ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function sessionCookie(response: Response): string {
  const fromGetSetCookie = response.headers.getSetCookie?.().join(", ") ?? "";
  const header = fromGetSetCookie !== "" ? fromGetSetCookie : (response.headers.get("set-cookie") ?? "");
  const match = /((?:__Secure-)?better-auth\.session_token=[^;]+)/.exec(header);

  if (match?.[1] === undefined) {
    throw new Error(`No session cookie in response: ${header}`);
  }

  return match[1];
}

async function signInAs(email: string): Promise<string> {
  const response = await api("POST", "/api/auth/sign-up/email", {
    name: email,
    email,
    password: PASSWORD,
  });

  return sessionCookie(response);
}

async function createKey(
  cookie: string,
  name: string,
): Promise<{ key: McpKeySummary; secret: string }> {
  const response = await api("POST", "/api/mcp-keys", { name }, cookie);

  expect(response.status).toBe(201);

  return (await response.json()) as { key: McpKeySummary; secret: string };
}

describe("MCP API keys", () => {
  it("shows the secret once, lists keys without it, and stores only a hash", async () => {
    const cookie = await signInAs("keys-create@example.com");

    const { key, secret } = await createKey(cookie, "Claude Desktop");

    expect(secret.startsWith("mem_")).toBe(true);
    expect(key.name).toBe("Claude Desktop");
    expect(secret.startsWith(key.prefix)).toBe(true);
    expect(key.prefix).not.toBe(secret);

    const list = await api("GET", "/api/mcp-keys", undefined, cookie);
    const listed = (await list.json()) as { keys: McpKeySummary[] };

    expect(listed.keys.map((entry) => entry.name)).toEqual(["Claude Desktop"]);
    expect(JSON.stringify(listed)).not.toContain(secret);

    const stored = await env.DB.prepare("select * from mcp_keys where id = ?")
      .bind(key.id)
      .first();

    expect(JSON.stringify(stored)).not.toContain(secret);
  });

  it("asks for a name before it makes a key", async () => {
    const cookie = await signInAs("keys-blank@example.com");

    const response = await api("POST", "/api/mcp-keys", { name: "   " }, cookie);

    expect(response.status).toBe(400);

    const list = await api("GET", "/api/mcp-keys", undefined, cookie);

    expect(((await list.json()) as { keys: unknown[] }).keys).toEqual([]);
  });

  it("keeps keys private to their owner and lets only the owner revoke them", async () => {
    const owner = await signInAs("keys-owner@example.com");
    const other = await signInAs("keys-other@example.com");
    const { key } = await createKey(owner, "Owner's assistant");

    const otherList = await api("GET", "/api/mcp-keys", undefined, other);

    expect(((await otherList.json()) as { keys: unknown[] }).keys).toEqual([]);
    expect((await api("DELETE", `/api/mcp-keys/${key.id}`, undefined, other)).status).toBe(404);

    const stillThere = await api("GET", "/api/mcp-keys", undefined, owner);

    expect(((await stillThere.json()) as { keys: McpKeySummary[] }).keys).toHaveLength(1);
    expect((await api("DELETE", `/api/mcp-keys/${key.id}`, undefined, owner)).status).toBe(204);

    const gone = await api("GET", "/api/mcp-keys", undefined, owner);

    expect(((await gone.json()) as { keys: unknown[] }).keys).toEqual([]);
  });

  it("turns away anyone who is not signed in", async () => {
    expect((await api("GET", "/api/mcp-keys")).status).toBe(401);
    expect((await api("POST", "/api/mcp-keys", { name: "x" })).status).toBe(401);
    expect((await api("DELETE", "/api/mcp-keys/anything")).status).toBe(401);
  });
});
