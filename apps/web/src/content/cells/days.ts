// A date cell holds a calendar day, `YYYY-MM-DD`, with no time and no zone.
// Days are parsed into local midnight so a calendar shows the day that was
// stored rather than the one the viewer's offset lands on.

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day a stored value names, or undefined if it names none. */
export function parseDay(value: unknown): Date | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parts = dayPattern.exec(value);
  if (parts === null) {
    return undefined;
  }
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

/** The stored form of a picked day. */
export function dayValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Fixed rather than the viewer's locale: the server renders these too, and a
// locale it cannot know would differ from what the browser then hydrates.
const dayFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** A day as people read it, e.g. `30 Jul 2026`. Anything else is left alone. */
export function formatDay(value: string): string {
  const date = parseDay(value);
  return date === undefined ? value : dayFormat.format(date);
}
