// Local hosts are allowed over plain http so delivery can be exercised
// against `vp dev` and local request bins; a deployed Worker's fetch to
// localhost goes nowhere harmful. Everything else must be https, and IP
// literals are rejected outright: signatures authenticate but do not
// encrypt, and a raw IP is the classic SSRF shape on any non-Cloudflare
// runtime this may be ported to.
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isDeliverableWebhookUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (localHosts.has(url.hostname)) {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }
  if (url.protocol !== 'https:') {
    return false;
  }
  const isIpLiteral = /^[\d.]+$/.test(url.hostname) || url.hostname.startsWith('[');
  return !isIpLiteral;
}
