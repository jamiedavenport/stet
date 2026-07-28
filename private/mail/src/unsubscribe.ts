/**
 * Signed one-click unsubscribe tokens (RFC 8058). A token names a subject
 * and is HMAC-signed with the auth secret, so the public unsubscribe
 * endpoint needs no session and no lookup table, and a token cannot be
 * forged or redirected at another user.
 */
export type UnsubscribeSubject =
  | { kind: 'notification-emails'; id: string }
  | { kind: 'invitation-reminders'; id: string };

const kinds = ['notification-emails', 'invitation-reminders'] as const;

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Mints the token for a subject. */
export async function createUnsubscribeToken(
  secret: string,
  subject: UnsubscribeSubject,
): Promise<string> {
  const payload = base64url(encoder.encode(`${subject.kind}:${subject.id}`));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

/** Verifies a token and returns its subject, or null for anything invalid. */
export async function verifyUnsubscribeToken(
  secret: string,
  token: string,
): Promise<UnsubscribeSubject | null> {
  const [payload, signature, ...rest] = token.split('.');
  if (payload === undefined || signature === undefined || rest.length > 0) {
    return null;
  }
  const signatureBytes = fromBase64url(signature);
  const payloadBytes = fromBase64url(payload);
  if (signatureBytes === null || payloadBytes === null) {
    return null;
  }
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes as unknown as ArrayBuffer,
    encoder.encode(payload),
  );
  if (!valid) {
    return null;
  }
  const decoded = new TextDecoder().decode(payloadBytes);
  const separator = decoded.indexOf(':');
  if (separator === -1) {
    return null;
  }
  const kind = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!kinds.includes(kind as (typeof kinds)[number]) || id === '') {
    return null;
  }
  return { kind: kind as (typeof kinds)[number], id };
}

/** The absolute one-click URL for a subject, served by the web app. */
export async function unsubscribeUrl(
  baseUrl: string,
  secret: string,
  subject: UnsubscribeSubject,
): Promise<string> {
  const token = await createUnsubscribeToken(secret, subject);
  return `${baseUrl}/mail/unsubscribe?token=${token}`;
}
