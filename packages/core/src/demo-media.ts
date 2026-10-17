const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const STORED_BLOCK_MAX = 65_535;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;

  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;

  for (const byte of bytes) {
    a = (a + byte) % 65_521;
    b = (b + a) % 65_521;
  }

  return ((b << 16) | a) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  const body = new Uint8Array(4 + data.length);

  body.set([...type].map((character) => character.charCodeAt(0)));
  body.set(data, 4);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(8 + data.length, crc32(body));

  return out;
}

/** Wraps raw bytes in a zlib stream of uncompressed ("stored") deflate blocks. */
function zlibStored(raw: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(raw.length / STORED_BLOCK_MAX));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let offset = 0;

  out[offset++] = 0x78;
  out[offset++] = 0x01;

  for (let block = 0; block < blocks; block += 1) {
    const start = block * STORED_BLOCK_MAX;
    const length = Math.min(STORED_BLOCK_MAX, raw.length - start);

    out[offset++] = block === blocks - 1 ? 1 : 0;
    out[offset++] = length & 0xff;
    out[offset++] = length >>> 8;
    out[offset++] = ~length & 0xff;
    out[offset++] = (~length >>> 8) & 0xff;
    out.set(raw.subarray(start, start + length), offset);
    offset += length;
  }

  new DataView(out.buffer).setUint32(offset, adler32(raw));

  return out;
}

/**
 * A small RGB PNG fading diagonally from one colour to another. The demo account
 * uses these as stand-in photos, so no binary files need to live in the repo.
 */
export function gradientPng(
  width: number,
  height: number,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): Uint8Array {
  const stride = 1 + width * 3;
  const raw = new Uint8Array(stride * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const t = (x / Math.max(1, width - 1) + y / Math.max(1, height - 1)) / 2;
      const base = y * stride + 1 + x * 3;

      for (let channel = 0; channel < 3; channel += 1) {
        raw[base + channel] = Math.round((from[channel] ?? 0) * (1 - t) + (to[channel] ?? 0) * t);
      }
    }
  }

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);

  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);

  const parts = [
    new Uint8Array(SIGNATURE),
    chunk("IHDR", header),
    chunk("IDAT", zlibStored(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }

  return png;
}
