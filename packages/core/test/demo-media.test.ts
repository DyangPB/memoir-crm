import { describe, expect, it } from "vitest";

import { gradientPng } from "../src/demo-media";

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function chunkTypes(png: Uint8Array): string[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const types: string[] = [];
  let offset = 8;

  while (offset < png.length) {
    const length = view.getUint32(offset);

    types.push(String.fromCharCode(...png.slice(offset + 4, offset + 8)));
    offset += 12 + length;
  }

  return types;
}

describe("gradientPng", () => {
  const png = gradientPng(64, 48, [10, 20, 30], [200, 210, 220]);

  it("starts with the PNG signature", () => {
    expect([...png.slice(0, 8)]).toEqual(SIGNATURE);
  });

  it("declares its own size in the header chunk", () => {
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);

    expect(view.getUint32(16)).toBe(64);
    expect(view.getUint32(20)).toBe(48);
  });

  it("is made of a header, image data, and an end chunk", () => {
    expect(chunkTypes(png)).toEqual(["IHDR", "IDAT", "IEND"]);
  });

  it("ends with the fixed IEND checksum", () => {
    expect([...png.slice(-4)]).toEqual([0xae, 0x42, 0x60, 0x82]);
  });

  it("keeps the same chunk layout when the image needs several deflate blocks", () => {
    expect(chunkTypes(gradientPng(300, 200, [0, 0, 0], [255, 255, 255]))).toEqual([
      "IHDR",
      "IDAT",
      "IEND",
    ]);
  });
});
