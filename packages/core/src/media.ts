const MB = 1024 * 1024;

export const PHOTO_MAX_BYTES = 5 * MB;
export const ATTACHMENT_MAX_BYTES = 10 * MB;

const FILE_NAME_MAX_LENGTH = 200;
const INLINE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type MediaFile = { contentType: string; size: number };

export type AttachmentFile = MediaFile & { fileName: string };

export type PhotoValidation =
  | { ok: true; photo: MediaFile }
  | { ok: false; message: string };

export type AttachmentValidation =
  | { ok: true; attachment: AttachmentFile }
  | { ok: false; message: string };

function mediaType(contentType: string): string {
  return (contentType.split(";")[0] ?? "").trim().toLowerCase();
}

/** Raster images are shown inline; SVG is excluded because it can carry script. */
export function isInlineImage(contentType: string): boolean {
  return (INLINE_IMAGE_TYPES as readonly string[]).includes(mediaType(contentType));
}

export function validatePhoto(file: MediaFile): PhotoValidation {
  const contentType = mediaType(file.contentType);

  if (!isInlineImage(contentType)) {
    return { ok: false, message: "Photos need to be JPEG, PNG, WebP, or GIF." };
  }

  if (file.size <= 0) {
    return { ok: false, message: "That file is empty." };
  }

  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, message: "That photo is too big. Keep it under 5 MB." };
  }

  return { ok: true, photo: { contentType, size: file.size } };
}

function cleanFileName(fileName: string): string {
  const own = (fileName.split(/[\\/]/).pop() ?? "").trim();

  if (own === "" || own === "." || own === "..") {
    return "attachment";
  }

  if (own.length <= FILE_NAME_MAX_LENGTH) {
    return own;
  }

  const dot = own.lastIndexOf(".");
  const extension = dot > 0 && own.length - dot <= 20 ? own.slice(dot) : "";

  return own.slice(0, FILE_NAME_MAX_LENGTH - extension.length) + extension;
}

export function validateAttachment(file: AttachmentFile): AttachmentValidation {
  if (file.size <= 0) {
    return { ok: false, message: "That file is empty." };
  }

  if (file.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, message: "That file is too big. Keep it under 10 MB." };
  }

  const contentType = mediaType(file.contentType);

  return {
    ok: true,
    attachment: {
      fileName: cleanFileName(file.fileName),
      contentType: contentType === "" ? "application/octet-stream" : contentType,
      size: file.size,
    },
  };
}
