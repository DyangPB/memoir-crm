import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";

type Json = Record<string, unknown>;

async function post(path: string, body: Json, cookie?: string): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      ...(cookie !== undefined ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function getSession(cookie: string): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}/api/auth/get-session`, {
    headers: { cookie },
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

async function signUp(name: string, email: string): Promise<Response> {
  return post("/api/auth/sign-up/email", { name, email, password: PASSWORD });
}

describe("sign up with email and password", () => {
  it("creates the user, starts a session, and stores a PBKDF2 hash", async () => {
    const response = await signUp("Dana Reyes", "dana@example.com");

    expect(response.status).toBe(200);

    const cookie = sessionCookie(response);
    const session = await getSession(cookie);

    expect(session.status).toBe(200);
    const body = (await session.json()) as { user: { email: string }; session: unknown };
    expect(body.user.email).toBe("dana@example.com");
    expect(body.session).not.toBeNull();

    const user = await env.DB.prepare("SELECT name, email FROM users WHERE email = ?")
      .bind("dana@example.com")
      .first<{ name: string; email: string }>();
    expect(user).toEqual({ name: "Dana Reyes", email: "dana@example.com" });

    const account = await env.DB.prepare(
      "SELECT password FROM accounts WHERE provider_id = 'credential'",
    ).first<{ password: string }>();
    expect(account?.password).toMatch(/^pbkdf2\$100000\$/);
    expect(account?.password).not.toContain(PASSWORD);
  });

  it("refuses a second account on the same email", async () => {
    await signUp("First", "taken@example.com");
    const second = await signUp("Second", "taken@example.com");

    expect(second.ok).toBe(false);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE email = ?",
    )
      .bind("taken@example.com")
      .first<{ count: number }>();
    expect(count?.count).toBe(1);
  });
});

describe("sign in and sign out", () => {
  it("signs an existing user in with the right password and rejects a wrong one", async () => {
    await signUp("Ines Okafor", "ines@example.com");

    const wrong = await post("/api/auth/sign-in/email", {
      email: "ines@example.com",
      password: "not-the-password",
    });
    expect(wrong.status).toBe(401);

    const right = await post("/api/auth/sign-in/email", {
      email: "ines@example.com",
      password: PASSWORD,
    });
    expect(right.status).toBe(200);

    const session = await getSession(sessionCookie(right));
    const body = (await session.json()) as { user: { email: string } };
    expect(body.user.email).toBe("ines@example.com");
  });

  it("clears the session on sign out", async () => {
    const signUpResponse = await signUp("Kofi Mensah", "kofi@example.com");
    const cookie = sessionCookie(signUpResponse);

    const signOut = await post("/api/auth/sign-out", {}, cookie);
    expect(signOut.status).toBe(200);

    const session = await getSession(cookie);
    const body = await session.json();
    expect(body).toBeNull();

    const rows = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)",
    )
      .bind("kofi@example.com")
      .first<{ count: number }>();
    expect(rows?.count).toBe(0);
  });
});

describe("delete account", () => {
  it("removes the user, sessions, and accounts behind a password confirmation", async () => {
    const signUpResponse = await signUp("Lena Fischer", "lena@example.com");
    const cookie = sessionCookie(signUpResponse);

    const response = await post("/api/auth/delete-user", { password: PASSWORD }, cookie);
    expect(response.status).toBe(200);

    const users = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE email = ?",
    )
      .bind("lena@example.com")
      .first<{ count: number }>();
    const sessions = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)",
    )
      .bind("lena@example.com")
      .first<{ count: number }>();
    const accounts = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM accounts WHERE user_id = (SELECT id FROM users WHERE email = ?)",
    )
      .bind("lena@example.com")
      .first<{ count: number }>();

    expect(users?.count).toBe(0);
    expect(sessions?.count).toBe(0);
    expect(accounts?.count).toBe(0);
  });

  it("keeps the account when the password is wrong", async () => {
    const signUpResponse = await signUp("Marco Silva", "marco@example.com");
    const cookie = sessionCookie(signUpResponse);

    const response = await post("/api/auth/delete-user", { password: "wrong-password" }, cookie);
    expect(response.ok).toBe(false);

    const users = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE email = ?",
    )
      .bind("marco@example.com")
      .first<{ count: number }>();
    expect(users?.count).toBe(1);
  });
});

describe("GET /api/config", () => {
  it("reports Google sign-in as unavailable when credentials are missing", async () => {
    const response = await exports.default.fetch(`${ORIGIN}/api/config`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ googleEnabled: false });
  });
});
