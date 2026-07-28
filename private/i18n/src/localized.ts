import { m } from './paraglide/messages.js';
import type { Locale } from './paraglide/runtime.js';

type Messages = typeof m;

/**
 * Every message bound to a fixed locale: same typed inputs, no trailing
 * `{ locale }`. Messages that take no inputs stay callable with none.
 */
export type LocalizedMessages = {
  [K in keyof Messages]: Messages[K] extends (inputs: infer I, options?: infer _O) => infer R
    ? {} extends I
      ? (inputs?: I) => R
      : (inputs: I) => R
    : Messages[K];
};

// Bound objects are immutable per locale, so building each once is enough.
const cache = new Map<Locale, LocalizedMessages>();

/**
 * Binds every message to `locale` for callers that render outside a request
 * scope (email, jobs, Durable Objects), so a template calls `t.some_key()`
 * once bound instead of repeating `m.some_key(inputs, { locale })`. Explicit
 * and per-locale: no ambient or global state, safe under concurrent renders.
 *
 * @example
 * const t = localized(recipientLocale);
 * t.reset_password_subject({ brandName });
 */
export function localized(locale: Locale): LocalizedMessages {
  const cached = cache.get(locale);
  if (cached !== undefined) {
    return cached;
  }
  const entries = Object.entries(m).map(([key, message]) => {
    const bound = (inputs?: unknown) =>
      (message as (i?: unknown, o?: { locale: Locale }) => string)(inputs, { locale });
    return [key, bound] as const;
  });
  const bound = Object.fromEntries(entries) as LocalizedMessages;
  cache.set(locale, bound);
  return bound;
}
