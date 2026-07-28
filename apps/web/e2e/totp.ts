import { createHmac } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// RFC 4648 base32, as used in otpauth secrets.
function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// RFC 6238 TOTP with Better Auth's defaults (SHA-1, 30s period, 6 digits).
// A tiny local implementation beats an otp dependency for one spec.
export function totpCode(totpURI: string, now = Date.now()): string {
  const secret = new URL(totpURI).searchParams.get('secret');
  if (secret === null) {
    throw new Error('totpURI has no secret parameter');
  }
  const counter = Math.floor(now / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) * 2 ** 24 +
      digest[offset + 1] * 2 ** 16 +
      digest[offset + 2] * 2 ** 8 +
      digest[offset + 3]) %
    1_000_000;
  return String(code).padStart(6, '0');
}
