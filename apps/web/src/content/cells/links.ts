/**
 * A link cell's value, or null if the text is not a link. A bare host is
 * what people type, so it gains the scheme it meant; anything that is not a
 * web address is refused rather than stored for a reader to trip over.
 */
export function toLink(raw: string): string | null {
  const typed = raw.trim();
  if (typed === '') {
    return null;
  }
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
    return null;
  }
  return candidate;
}
