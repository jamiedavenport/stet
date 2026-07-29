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
