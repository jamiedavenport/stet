/**
 * Redirects a `www.` request to the same URL on the bare domain, so exactly one
 * origin serves the app. Sessions, OAuth callbacks, and canonical links are all
 * issued for that host, and a visitor who arrived on `www` would otherwise hold
 * none of them.
 *
 * Derived from the request's own hostname rather than a configured origin, so a
 * self-hosted deployment gets the same behaviour on its own domain. Returns
 * null when the host is already canonical.
 */
export function redirectToCanonicalHost(request: Request, url: URL): Response | null {
  if (!url.hostname.startsWith('www.')) {
    return null;
  }

  const target = new URL(url);
  target.hostname = url.hostname.slice('www.'.length);
  // 308 for anything that carries a body: a 301 permits the client to retry it
  // as a GET, which silently drops the payload.
  const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
  return Response.redirect(target.href, status);
}
