import {
  ATTACHMENT_MAX_BYTES,
  isInlineImage,
  PHOTO_MAX_BYTES,
  validateAttachment,
  validatePhoto,
} from "@memoir/core";
import { contacts, interactionAttachments } from "@memoir/db";
import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";

import { findOwnedContact, labelsForContact, latestInteractionOn, toContact } from "../lib/contacts";
import { createDb } from "../lib/db";
import { attachmentsByInteraction, findOwnedInteraction, toAttachment } from "../lib/interactions";
import { attachmentKey, deleteObjects, photoKey } from "../lib/media";
import { getSessionUser } from "../lib/session";
import { defaultCadenceDays } from "../lib/settings";

export const mediaRoutes = new Hono<{ Bindings: Env }>();

type MediaContext = Context<{ Bindings: Env }>;

// Stored files are served from the app's own origin, so they are sandboxed in case a
// browser is ever pointed straight at one.
const MEDIA_HEADERS = {
  "cache-control": "private, no-cache",
  "content-security-policy": "sandbox; default-src 'none'",
  "x-content-type-options": "nosniff",
};

/** Reads an upload's bytes, refusing early when it declares itself larger than `limit`. */
async function readUpload(
  c: MediaContext,
  limit: number,
): Promise<{ bytes: ArrayBuffer; contentType: string; size: number }> {
  const declared = Number(c.req.header("content-length") ?? "0");
  const contentType = c.req.header("content-type") ?? "";

  if (declared > limit) {
    return { bytes: new ArrayBuffer(0), contentType, size: declared };
  }

  const bytes = await c.req.arrayBuffer();

  return { bytes, contentType, size: bytes.byteLength };
}

function contentDisposition(fileName: string, inline: boolean): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  // encodeURIComponent leaves ' ( ) * alone, which RFC 5987 doesn't allow in filename*.
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

mediaRoutes.put("/contacts/:id/photo", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const existing = await findOwnedContact(c.env, user.id, id);

  if (existing === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  const upload = await readUpload(c, PHOTO_MAX_BYTES);
  const checked = validatePhoto({ contentType: upload.contentType, size: upload.size });

  if (!checked.ok) {
    return c.json({ error: checked.message }, 400);
  }

  const key = photoKey(user.id, id);

  await c.env.MEDIA.put(key, upload.bytes, {
    httpMetadata: { contentType: checked.photo.contentType },
  });

  const updatedAt = new Date();

  await createDb(c.env)
    .update(contacts)
    .set({ photoKey: key, updatedAt })
    .where(and(eq(contacts.id, id), eq(contacts.userId, user.id)));

  return c.json({
    contact: toContact(
      { ...existing, photoKey: key, updatedAt },
      await latestInteractionOn(c.env, user.id, id),
      await labelsForContact(c.env, user.id, id),
      await defaultCadenceDays(c.env, user.id),
    ),
  });
});

mediaRoutes.get("/contacts/:id/photo", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contact = await findOwnedContact(c.env, user.id, c.req.param("id"));
  const object =
    contact === null || contact.photoKey === null ? null : await c.env.MEDIA.get(contact.photoKey);

  if (object === null) {
    return c.json({ error: "That contact has no photo." }, 404);
  }

  return new Response(object.body, {
    headers: {
      ...MEDIA_HEADERS,
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      etag: object.httpEtag,
    },
  });
});

mediaRoutes.delete("/contacts/:id/photo", async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const contact = await findOwnedContact(c.env, user.id, id);

  if (contact === null) {
    return c.json({ error: "That contact isn't here." }, 404);
  }

  if (contact.photoKey !== null) {
    await deleteObjects(c.env, [contact.photoKey]);
    await createDb(c.env)
      .update(contacts)
      .set({ photoKey: null, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.userId, user.id)));
  }

  return c.body(null, 204);
});

const ATTACHMENTS = "/contacts/:contactId/interactions/:interactionId/attachments";

mediaRoutes.get(ATTACHMENTS, async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interactionId = c.req.param("interactionId");
  const interaction = await findOwnedInteraction(
    c.env,
    user.id,
    c.req.param("contactId"),
    interactionId,
  );

  if (interaction === null) {
    return c.json({ error: "That interaction isn't here." }, 404);
  }

  const attachments = await attachmentsByInteraction(c.env, user.id, { interactionId });

  return c.json({ attachments: attachments.get(interactionId) ?? [] });
});

mediaRoutes.post(ATTACHMENTS, async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interactionId = c.req.param("interactionId");
  const interaction = await findOwnedInteraction(
    c.env,
    user.id,
    c.req.param("contactId"),
    interactionId,
  );

  if (interaction === null) {
    return c.json({ error: "That interaction isn't here." }, 404);
  }

  const upload = await readUpload(c, ATTACHMENT_MAX_BYTES);
  const checked = validateAttachment({
    fileName: c.req.query("name") ?? "",
    contentType: upload.contentType,
    size: upload.size,
  });

  if (!checked.ok) {
    return c.json({ error: checked.message }, 400);
  }

  const id = crypto.randomUUID();
  const key = attachmentKey(user.id, id);

  await c.env.MEDIA.put(key, upload.bytes, {
    httpMetadata: { contentType: checked.attachment.contentType },
  });

  const row = {
    id,
    userId: user.id,
    contactId: interaction.contactId,
    interactionId,
    objectKey: key,
    fileName: checked.attachment.fileName,
    contentType: checked.attachment.contentType,
    size: checked.attachment.size,
    createdAt: new Date(),
  };

  try {
    await createDb(c.env).insert(interactionAttachments).values(row);
  } catch (error) {
    await deleteObjects(c.env, [key]);
    throw error;
  }

  return c.json({ attachment: toAttachment(row) }, 201);
});

async function findAttachment(c: MediaContext, userId: string) {
  const interaction = await findOwnedInteraction(
    c.env,
    userId,
    c.req.param("contactId") ?? "",
    c.req.param("interactionId") ?? "",
  );

  if (interaction === null) {
    return null;
  }

  const rows = await createDb(c.env)
    .select()
    .from(interactionAttachments)
    .where(
      and(
        eq(interactionAttachments.id, c.req.param("attachmentId") ?? ""),
        eq(interactionAttachments.interactionId, interaction.id),
        eq(interactionAttachments.userId, userId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

mediaRoutes.get(`${ATTACHMENTS}/:attachmentId`, async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const attachment = await findAttachment(c, user.id);
  const object = attachment === null ? null : await c.env.MEDIA.get(attachment.objectKey);

  if (attachment === null || object === null) {
    return c.json({ error: "That attachment isn't here." }, 404);
  }

  return new Response(object.body, {
    headers: {
      ...MEDIA_HEADERS,
      "content-type": attachment.contentType,
      "content-disposition": contentDisposition(
        attachment.fileName,
        isInlineImage(attachment.contentType),
      ),
      etag: object.httpEtag,
    },
  });
});

mediaRoutes.delete(`${ATTACHMENTS}/:attachmentId`, async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);

  if (user === null) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const attachment = await findAttachment(c, user.id);

  if (attachment === null) {
    return c.json({ error: "That attachment isn't here." }, 404);
  }

  await deleteObjects(c.env, [attachment.objectKey]);
  await createDb(c.env)
    .delete(interactionAttachments)
    .where(
      and(eq(interactionAttachments.id, attachment.id), eq(interactionAttachments.userId, user.id)),
    );

  return c.body(null, 204);
});
