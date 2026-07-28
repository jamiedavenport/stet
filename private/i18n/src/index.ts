import type { Locale } from './paraglide/runtime.js';

export {
  baseLocale,
  cookieMaxAge,
  cookieName,
  getLocale,
  isLocale,
  locales,
  setLocale,
  type Locale,
} from './paraglide/runtime.js';

/**
 * A language's name in itself ("English", "Español", "Français"), so a picker
 * reads correctly whatever the current UI language is.
 */
export function languageName(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
