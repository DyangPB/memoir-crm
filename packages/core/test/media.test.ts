import { describe, expect, it } from "vitest";

import { isInlineImage, validateAttachment, validatePhoto } from "../src/media";

const MB = 1024 * 1024;

describe("validatePhoto", () => {
  it("accepts JPEG, PNG, WebP, and GIF up to 5 MB", () => {
    for (const contentType of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validatePhoto({ contentType, size: 5 * MB })).toEqual({
        ok: true,
        photo: { contentType, size: 5 * MB },
      });
    }
  });

  it("ignores case and parameters on the content type", () => {
    expect(validatePhoto({ contentType: "Image/JPEG; charset=binary", size: 10 })).toEqual({
      ok: true,
      photo: { contentType: "image/jpeg", size: 10 },
    });
  });

  it("rejects a photo over 5 MB", () => {
    expect(validatePhoto({ contentType: "image/png", size: 5 * MB + 1 })).toEqual({
      ok: false,
      message: "That photo is too big. Keep it under 5 MB.",
    });
  });

  it("rejects an empty photo", () => {
    expect(validatePhoto({ contentType: "image/png", size: 0 })).toEqual({
      ok: false,
      message: "That file is empty.",
    });
  });

  it("rejects anything that isn't a plain raster image", () => {
    const message = "Photos need to be JPEG, PNG, WebP, or GIF.";

    expect(validatePhoto({ contentType: "image/svg+xml", size: 10 })).toEqual({ ok: false, message });
    expect(validatePhoto({ contentType: "application/pdf", size: 10 })).toEqual({ ok: false, message });
    expect(validatePhoto({ contentType: "", size: 10 })).toEqual({ ok: false, message });
  });
});

describe("validateAttachment", () => {
  it("accepts any file type up to 10 MB", () => {
    expect(
      validateAttachment({ fileName: "Resume.pdf", contentType: "application/pdf", size: 10 * MB }),
    ).toEqual({
      ok: true,
      attachment: { fileName: "Resume.pdf", contentType: "application/pdf", size: 10 * MB },
    });
  });

  it("falls back to a generic content type", () => {
    expect(validateAttachment({ fileName: "notes.xyz", contentType: "", size: 5 })).toEqual({
      ok: true,
      attachment: { fileName: "notes.xyz", contentType: "application/octet-stream", size: 5 },
    });
  });

  it("rejects a file over 10 MB or an empty one", () => {
    expect(
      validateAttachment({ fileName: "big.zip", contentType: "application/zip", size: 10 * MB + 1 }),
    ).toEqual({ ok: false, message: "That file is too big. Keep it under 10 MB." });
    expect(validateAttachment({ fileName: "empty.txt", contentType: "text/plain", size: 0 })).toEqual({
      ok: false,
      message: "That file is empty.",
    });
  });

  it("keeps only the file's own name, never a path", () => {
    const name = (fileName: string) => {
      const result = validateAttachment({ fileName, contentType: "text/plain", size: 1 });

      return result.ok ? result.attachment.fileName : result.message;
    };

    expect(name("C:\\docs\\Resume.pdf")).toBe("Resume.pdf");
    expect(name("../../etc/passwd")).toBe("passwd");
    expect(name("  trip photos.zip  ")).toBe("trip photos.zip");
  });

  it("names a file that has no usable name", () => {
    const result = validateAttachment({ fileName: "  ", contentType: "text/plain", size: 1 });

    expect(result).toMatchObject({ ok: true, attachment: { fileName: "attachment" } });
  });

  it("caps a very long file name, keeping the extension", () => {
    const result = validateAttachment({
      fileName: `${"a".repeat(300)}.pdf`,
      contentType: "application/pdf",
      size: 1,
    });

    expect(result.ok && result.attachment.fileName.length).toBe(200);
    expect(result.ok && result.attachment.fileName.endsWith(".pdf")).toBe(true);
  });
});

describe("isInlineImage", () => {
  it("shows raster images inline and nothing else", () => {
    expect(isInlineImage("image/jpeg")).toBe(true);
    expect(isInlineImage("image/png")).toBe(true);
    expect(isInlineImage("image/webp")).toBe(true);
    expect(isInlineImage("image/gif")).toBe(true);
    expect(isInlineImage("image/svg+xml")).toBe(false);
    expect(isInlineImage("application/pdf")).toBe(false);
  });
});
