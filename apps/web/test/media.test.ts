import type { Contact, Interaction, InteractionAttachment } from "@memoir/core";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://memoir.test";
const PASSWORD = "correct-horse-9";
const MB = 1024 * 1024;

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

async function upload(
  path: string,
  bytes: Uint8Array,
  contentType: string,
  cookie: string,
  method = "PUT",
): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method,
    headers: { origin: ORIGIN, "content-type": contentType, cookie },
    body: bytes,
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

async function userIdFor(email: string): Promise<string> {
  const row = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();

  if (row === null) {
    throw new Error(`No user for ${email}`);
  }

  return row.id;
}

async function storedObjects(userId: string): Promise<string[]> {
  const listed = await env.MEDIA.list({ prefix: `${userId}/` });

  return listed.objects.map((object) => object.key);
}

async function createContact(
  cookie: string,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<Contact> {
  const response = await api("POST", "/api/contacts", { name, ...extra }, cookie);

  expect(response.status).toBe(201);

  return ((await response.json()) as { contact: Contact }).contact;
}

async function createInteraction(cookie: string, contactId: string): Promise<Interaction> {
  const response = await api(
    "POST",
    `/api/contacts/${contactId}/interactions`,
    { type: "call", occurredOn: "2026-10-01", note: "Caught up" },
    cookie,
  );

  expect(response.status).toBe(201);

  return ((await response.json()) as { interaction: Interaction }).interaction;
}

function bytes(length: number, fill = 7): Uint8Array {
  return new Uint8Array(length).fill(fill);
}

describe("contact profile fields", () => {
  it("saves location, role/company, and timezone, and gives them back", async () => {
    const cookie = await signInAs("media-profile@example.com");
    const contact = await createContact(cookie, "Bob Nguyen", {
      location: " Lisbon, Portugal ",
      roleCompany: "Engineer at Acme",
      timezone: "europe/lisbon",
    });

    expect(contact).toMatchObject({
      location: "Lisbon, Portugal",
      roleCompany: "Engineer at Acme",
      timezone: "Europe/Lisbon",
      photoVersion: null,
    });

    const updated = await api(
      "PUT",
      `/api/contacts/${contact.id}`,
      { name: "Bob Nguyen", location: null, timezone: "Asia/Tokyo" },
      cookie,
    );
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as { contact: Contact }).contact).toMatchObject({
      location: null,
      roleCompany: null,
      timezone: "Asia/Tokyo",
    });

    const fetched = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(((await fetched.json()) as { contact: Contact }).contact.timezone).toBe("Asia/Tokyo");
  });

  it("rejects a timezone that isn't an IANA name", async () => {
    const cookie = await signInAs("media-profile-invalid@example.com");
    const response = await api("POST", "/api/contacts", { name: "Ada", timezone: "Mars/Olympus" }, cookie);

    expect(response.status).toBe(400);
  });
});

describe("contact photos", () => {
  it("has no photo until one is uploaded", async () => {
    const cookie = await signInAs("media-photo-none@example.com");
    const contact = await createContact(cookie, "Ada Lovelace");

    expect(contact.photoVersion).toBeNull();
    expect((await api("GET", `/api/contacts/${contact.id}/photo`, undefined, cookie)).status).toBe(404);
  });

  it("stores an uploaded photo and serves the same bytes back", async () => {
    const email = "media-photo-roundtrip@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Bob Nguyen");
    const photo = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

    const put = await upload(`/api/contacts/${contact.id}/photo`, photo, "image/png", cookie);
    expect(put.status).toBe(200);
    expect(((await put.json()) as { contact: Contact }).contact.photoVersion).toEqual(expect.any(Number));

    const got = await api("GET", `/api/contacts/${contact.id}/photo`, undefined, cookie);
    expect(got.status).toBe(200);
    expect(got.headers.get("content-type")).toBe("image/png");
    expect(got.headers.get("x-content-type-options")).toBe("nosniff");
    expect(got.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(photo);

    const fetched = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(((await fetched.json()) as { contact: Contact }).contact.photoVersion).toEqual(expect.any(Number));
    expect(await storedObjects(await userIdFor(email))).toHaveLength(1);
  });

  it("replaces a photo without leaving the old one behind", async () => {
    const email = "media-photo-replace@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Lena Fischer");
    const path = `/api/contacts/${contact.id}/photo`;

    await upload(path, bytes(10, 1), "image/png", cookie);
    await upload(path, bytes(12, 2), "image/jpeg", cookie);

    const got = await api("GET", path, undefined, cookie);
    expect(got.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(bytes(12, 2));
    expect(await storedObjects(await userIdFor(email))).toHaveLength(1);
  });

  it("removes a photo, falling back to no photo", async () => {
    const email = "media-photo-remove@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Marco Silva");
    const path = `/api/contacts/${contact.id}/photo`;

    await upload(path, bytes(10), "image/webp", cookie);

    expect((await api("DELETE", path, undefined, cookie)).status).toBe(204);
    expect((await api("GET", path, undefined, cookie)).status).toBe(404);
    expect(await storedObjects(await userIdFor(email))).toEqual([]);

    const fetched = await api("GET", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(((await fetched.json()) as { contact: Contact }).contact.photoVersion).toBeNull();
  });

  it("rejects a photo that is the wrong type, empty, or over 5 MB", async () => {
    const cookie = await signInAs("media-photo-invalid@example.com");
    const contact = await createContact(cookie, "Ines Okafor");
    const path = `/api/contacts/${contact.id}/photo`;

    expect((await upload(path, bytes(10), "image/svg+xml", cookie)).status).toBe(400);
    expect((await upload(path, bytes(10), "application/pdf", cookie)).status).toBe(400);
    expect((await upload(path, bytes(0), "image/png", cookie)).status).toBe(400);
    expect((await upload(path, bytes(5 * MB + 1), "image/png", cookie)).status).toBe(400);
    expect((await upload(path, bytes(5 * MB), "image/png", cookie)).status).toBe(200);
  });

  it("hides another user's contact photo from every verb", async () => {
    const owner = await signInAs("media-photo-owner@example.com");
    const stranger = await signInAs("media-photo-stranger@example.com");
    const contact = await createContact(owner, "Dana Reyes");
    const path = `/api/contacts/${contact.id}/photo`;

    await upload(path, bytes(10), "image/png", owner);

    expect((await api("GET", path, undefined, stranger)).status).toBe(404);
    expect((await upload(path, bytes(10), "image/png", stranger)).status).toBe(404);
    expect((await api("DELETE", path, undefined, stranger)).status).toBe(404);
    expect((await api("GET", path, undefined, owner)).status).toBe(200);
  });

  it("needs a signed-in user", async () => {
    const owner = await signInAs("media-photo-anon@example.com");
    const contact = await createContact(owner, "Zebra Keeper");

    expect((await api("GET", `/api/contacts/${contact.id}/photo`)).status).toBe(401);
  });

  it("deletes the photo's file along with the contact", async () => {
    const email = "media-photo-cascade@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Ada Lovelace");

    await upload(`/api/contacts/${contact.id}/photo`, bytes(10), "image/png", cookie);
    expect(await storedObjects(await userIdFor(email))).toHaveLength(1);

    expect((await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie)).status).toBe(204);
    expect(await storedObjects(await userIdFor(email))).toEqual([]);
  });
});

describe("interaction attachments", () => {
  function attachmentsPath(contactId: string, interactionId: string): string {
    return `/api/contacts/${contactId}/interactions/${interactionId}/attachments`;
  }

  it("uploads a file, lists it, and downloads the same bytes", async () => {
    const cookie = await signInAs("media-attach-roundtrip@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");
    const interaction = await createInteraction(cookie, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);
    const file = new Uint8Array([37, 80, 68, 70, 45, 1, 2, 3]);

    const post = await upload(`${path}?name=Resume.pdf`, file, "application/pdf", cookie, "POST");
    expect(post.status).toBe(201);
    const { attachment } = (await post.json()) as { attachment: InteractionAttachment };
    expect(attachment).toEqual({
      id: expect.any(String),
      interactionId: interaction.id,
      fileName: "Resume.pdf",
      contentType: "application/pdf",
      size: file.length,
      createdAt: expect.any(String),
    });

    const listed = await api("GET", path, undefined, cookie);
    expect(((await listed.json()) as { attachments: InteractionAttachment[] }).attachments).toEqual([
      attachment,
    ]);

    const download = await api("GET", `${path}/${attachment.id}`, undefined, cookie);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("content-disposition")).toContain("attachment");
    expect(download.headers.get("content-disposition")).toContain("Resume.pdf");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(file);
  });

  it("keeps a tricky file name intact in the download header", async () => {
    const cookie = await signInAs("media-attach-filename@example.com");
    const contact = await createContact(cookie, "Bob Nguyen");
    const interaction = await createInteraction(cookie, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);
    const name = "Bob's résumé (1).pdf";
    const { attachment } = (await (
      await upload(`${path}?name=${encodeURIComponent(name)}`, bytes(5), "application/pdf", cookie, "POST")
    ).json()) as { attachment: InteractionAttachment };

    expect(attachment.fileName).toBe(name);

    const download = await api("GET", `${path}/${attachment.id}`, undefined, cookie);
    const disposition = download.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("filename*=UTF-8''Bob%27s%20r%C3%A9sum%C3%A9%20%281%29.pdf");
    expect(disposition).toContain('filename="Bob\'s r_sum_ (1).pdf"');
    expect(download.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
  });

  it("shows images inline and everything else as a download", async () => {
    const cookie = await signInAs("media-attach-inline@example.com");
    const contact = await createContact(cookie, "Ada Lovelace");
    const interaction = await createInteraction(cookie, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);

    const image = (await (
      await upload(`${path}?name=trip.jpg`, bytes(10), "image/jpeg", cookie, "POST")
    ).json()) as { attachment: InteractionAttachment };
    const svg = (await (
      await upload(`${path}?name=logo.svg`, bytes(10), "image/svg+xml", cookie, "POST")
    ).json()) as { attachment: InteractionAttachment };

    const inline = await api("GET", `${path}/${image.attachment.id}`, undefined, cookie);
    expect(inline.headers.get("content-disposition")).toContain("inline");

    const download = await api("GET", `${path}/${svg.attachment.id}`, undefined, cookie);
    expect(download.headers.get("content-disposition")).toContain("attachment");
  });

  it("lists attachments with the interaction in the Timeline", async () => {
    const cookie = await signInAs("media-attach-timeline@example.com");
    const contact = await createContact(cookie, "Lena Fischer");
    const interaction = await createInteraction(cookie, contact.id);

    await upload(
      `${attachmentsPath(contact.id, interaction.id)}?name=notes.txt`,
      bytes(5),
      "text/plain",
      cookie,
      "POST",
    );

    const timeline = await api("GET", `/api/contacts/${contact.id}/interactions`, undefined, cookie);
    const { interactions } = (await timeline.json()) as { interactions: Interaction[] };
    expect(interactions[0]?.attachments.map((item) => item.fileName)).toEqual(["notes.txt"]);
  });

  it("deletes an attachment and its file", async () => {
    const email = "media-attach-delete@example.com";
    const cookie = await signInAs(email);
    const contact = await createContact(cookie, "Marco Silva");
    const interaction = await createInteraction(cookie, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);
    const { attachment } = (await (
      await upload(`${path}?name=a.txt`, bytes(5), "text/plain", cookie, "POST")
    ).json()) as { attachment: InteractionAttachment };

    expect((await api("DELETE", `${path}/${attachment.id}`, undefined, cookie)).status).toBe(204);
    expect((await api("GET", `${path}/${attachment.id}`, undefined, cookie)).status).toBe(404);
    expect((await api("DELETE", `${path}/${attachment.id}`, undefined, cookie)).status).toBe(404);
    expect(await storedObjects(await userIdFor(email))).toEqual([]);

    const listed = await api("GET", path, undefined, cookie);
    expect(((await listed.json()) as { attachments: unknown[] }).attachments).toEqual([]);
  });

  it("rejects an empty file or one over 10 MB, and names a file with no name", async () => {
    const cookie = await signInAs("media-attach-invalid@example.com");
    const contact = await createContact(cookie, "Ines Okafor");
    const interaction = await createInteraction(cookie, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);

    expect((await upload(`${path}?name=a.txt`, bytes(0), "text/plain", cookie, "POST")).status).toBe(400);
    expect(
      (await upload(`${path}?name=big.bin`, bytes(10 * MB + 1), "application/zip", cookie, "POST")).status,
    ).toBe(400);

    const unnamed = await upload(path, bytes(5), "text/plain", cookie, "POST");
    expect(unnamed.status).toBe(201);
    expect(((await unnamed.json()) as { attachment: InteractionAttachment }).attachment.fileName).toBe(
      "attachment",
    );
  });

  it("hides another user's attachments from every verb", async () => {
    const owner = await signInAs("media-attach-owner@example.com");
    const stranger = await signInAs("media-attach-stranger@example.com");
    const contact = await createContact(owner, "Dana Reyes");
    const interaction = await createInteraction(owner, contact.id);
    const path = attachmentsPath(contact.id, interaction.id);
    const { attachment } = (await (
      await upload(`${path}?name=a.txt`, bytes(5), "text/plain", owner, "POST")
    ).json()) as { attachment: InteractionAttachment };

    expect((await api("GET", path, undefined, stranger)).status).toBe(404);
    expect((await upload(`${path}?name=x.txt`, bytes(5), "text/plain", stranger, "POST")).status).toBe(404);
    expect((await api("GET", `${path}/${attachment.id}`, undefined, stranger)).status).toBe(404);
    expect((await api("DELETE", `${path}/${attachment.id}`, undefined, stranger)).status).toBe(404);
    expect((await api("GET", `${path}/${attachment.id}`, undefined, owner)).status).toBe(200);
  });

  it("won't serve an attachment through a different interaction", async () => {
    const cookie = await signInAs("media-attach-mismatch@example.com");
    const contact = await createContact(cookie, "Kofi Mensah");
    const first = await createInteraction(cookie, contact.id);
    const second = await createInteraction(cookie, contact.id);
    const { attachment } = (await (
      await upload(
        `${attachmentsPath(contact.id, first.id)}?name=a.txt`,
        bytes(5),
        "text/plain",
        cookie,
        "POST",
      )
    ).json()) as { attachment: InteractionAttachment };

    const wrong = await api(
      "GET",
      `${attachmentsPath(contact.id, second.id)}/${attachment.id}`,
      undefined,
      cookie,
    );
    expect(wrong.status).toBe(404);
  });

  it("deletes the files when their interaction, or their contact, is deleted", async () => {
    const email = "media-attach-cascade@example.com";
    const cookie = await signInAs(email);
    const userId = await userIdFor(email);
    const contact = await createContact(cookie, "Sofia Marchetti");
    const interaction = await createInteraction(cookie, contact.id);
    const other = await createInteraction(cookie, contact.id);

    await upload(`${attachmentsPath(contact.id, interaction.id)}?name=a.txt`, bytes(5), "text/plain", cookie, "POST");
    await upload(`${attachmentsPath(contact.id, other.id)}?name=b.txt`, bytes(5), "text/plain", cookie, "POST");
    expect(await storedObjects(userId)).toHaveLength(2);

    await api("DELETE", `/api/contacts/${contact.id}/interactions/${interaction.id}`, undefined, cookie);
    expect(await storedObjects(userId)).toHaveLength(1);

    await api("DELETE", `/api/contacts/${contact.id}`, undefined, cookie);
    expect(await storedObjects(userId)).toEqual([]);
  });

  it("deletes every file when the account is deleted", async () => {
    const email = "media-attach-account@example.com";
    const cookie = await signInAs(email);
    const userId = await userIdFor(email);
    const contact = await createContact(cookie, "Ada Lovelace");
    const interaction = await createInteraction(cookie, contact.id);

    await upload(`/api/contacts/${contact.id}/photo`, bytes(5), "image/png", cookie);
    await upload(`${attachmentsPath(contact.id, interaction.id)}?name=a.txt`, bytes(5), "text/plain", cookie, "POST");
    expect(await storedObjects(userId)).toHaveLength(2);

    const response = await exports.default.fetch(`${ORIGIN}/api/auth/delete-user`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json", cookie },
      body: JSON.stringify({ password: PASSWORD }),
    });
    expect(response.status).toBe(200);
    expect(await storedObjects(userId)).toEqual([]);
  });
});
