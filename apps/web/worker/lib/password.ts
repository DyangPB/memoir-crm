const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;
const FORMAT_PREFIX = "pbkdf2";

function toBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_HASH, salt, iterations },
    key,
    KEY_LENGTH_BITS,
  );

  return new Uint8Array(bits);
}

/**
 * PBKDF2 through WebCrypto, tuned to the Workers CPU budget. 100,000 is the
 * highest iteration count workerd accepts, so it is also the strongest
 * setting available on the Free tier (ADR-0002).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);

  return `${FORMAT_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(data: { password: string; hash: string }): Promise<boolean> {
  const [prefix, iterationsPart, saltPart, hashPart] = data.hash.split("$");

  if (
    prefix !== FORMAT_PREFIX ||
    iterationsPart === undefined ||
    saltPart === undefined ||
    hashPart === undefined
  ) {
    return false;
  }

  const iterations = Number(iterationsPart);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const expected = fromBase64(hashPart);
  const actual = await derive(data.password, fromBase64(saltPart), iterations);

  return crypto.subtle.timingSafeEqual(actual, expected);
}
