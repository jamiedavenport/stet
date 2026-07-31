/** A URL- and API-safe handle derived from a human name. */
export function slugify(name: string, separator = '-'): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');
  return slug.length > 0 ? slug : 'untitled';
}

/** `base`, or the first `base-2`, `base-3`, ... not already taken. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>, separator = '-'): string {
  if (!taken.has(base)) {
    return base;
  }
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}${separator}${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * Whether `slug` is still what `name` produced, rather than something a
 * person chose. The disambiguating suffix `uniqueSlug` appends counts as
 * derived, so `hello-world-2` is still the machine's answer for "Hello
 * world" and not somebody's decision.
 *
 * This is what lets a slug follow a title around until the first time
 * anyone edits it by hand, without storing a flag to say so.
 */
export function isDerivedSlug(slug: string, name: string, separator = '-'): boolean {
  const base = slugify(name, separator);
  if (slug === base) {
    return true;
  }
  if (!slug.startsWith(`${base}${separator}`)) {
    return false;
  }
  const suffix = slug.slice(base.length + separator.length);
  return /^\d+$/.test(suffix) && Number(suffix) >= 2;
}
