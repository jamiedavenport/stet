// Fetching and shrinking source pages for the model: no headless browser and
// no readability pass, just the served HTML with the noise that costs tokens
// stripped out. JSON-LD survives because blogs put publish dates and authors
// there more reliably than in the visible markup.

const fetchTimeoutMs = 15_000;

export type FetchedPage = {
  url: string;
  /** Cleaned HTML, capped; what the model sees. */
  content: string;
};

export async function fetchPage(url: string, cap = 40_000): Promise<FetchedPage> {
  const response = await fetch(url, {
    headers: { 'user-agent': 'stet-import/0.1', accept: 'text/html' },
    signal: AbortSignal.timeout(fetchTimeoutMs),
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Fetching ${url} returned ${response.status}`);
  }
  const html = await response.text();
  return { url, content: cleanHtml(html).slice(0, cap) };
}

export function cleanHtml(html: string): string {
  return html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'stet-import/0.1' },
      signal: AbortSignal.timeout(fetchTimeoutMs),
      redirect: 'follow',
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}
