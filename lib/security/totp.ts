import crypto from "node:crypto";

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s steps) — the variant every authenticator app supports. */

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const stepSeconds = 30;
const digits = 6;

export function base32Encode(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function totpCounter(now = Date.now()) {
  return Math.floor(now / 1000 / stepSeconds);
}

export function totpCode(secret: string, counter: number) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/**
 * Checks a code against the current step and one step either side (clock drift). Returns the
 * matched counter so callers can refuse to accept the same code twice, or null if it doesn't match.
 */
export function verifyTotp(secret: string, code: string, options: { now?: number; lastUsedCounter?: number | null } = {}) {
  const normalised = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalised)) return null;
  const current = totpCounter(options.now);
  for (const counter of [current - 1, current, current + 1]) {
    if (options.lastUsedCounter !== null && options.lastUsedCounter !== undefined && counter <= options.lastUsedCounter) continue;
    const expected = Buffer.from(totpCode(secret, counter));
    if (crypto.timingSafeEqual(expected, Buffer.from(normalised))) return counter;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = "Carvey") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(digits), period: String(stepSeconds) });
  return `otpauth://totp/${label}?${params}`;
}

// ─── Recovery codes ─────────────────────────────────────────────────────────

const recoveryAlphabet = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(10);
    const chars = [...bytes].map((byte) => recoveryAlphabet[byte % recoveryAlphabet.length]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

export function normaliseRecoveryCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Recovery codes carry ~49 bits of randomness each, so a fast hash is enough to store them. */
export function hashRecoveryCode(code: string) {
  return crypto.createHash("sha256").update(normaliseRecoveryCode(code)).digest("hex");
}
