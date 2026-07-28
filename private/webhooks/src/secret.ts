// How long a rotated-out secret keeps signing alongside its replacement, so
// receivers can swap secrets without dropping deliveries.
export const secretRotationGraceMs = 24 * 60 * 60 * 1000;

// Standard Webhooks symmetric secret: base64-encoded random bytes behind the
// whsec_ prefix. Receivers can verify with any Standard Webhooks library.
export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `whsec_${btoa(String.fromCharCode(...bytes))}`;
}
