// The interface itself is monochrome, and stays that way. A mockup is a
// different job: it has to read as a screenshot of a busy product from across
// a landing page, so colour is spent here on the three things that carry it
// in the real app -- who is in the room, what state an entry is in, and data.
// Nothing in this file is used outside `mockups/`.

/** Someone editing alongside you. Their hue is theirs everywhere they appear. */
export type Person = {
  name: string;
  /** How the app labels their caret. */
  short: string;
  initials: string;
  /** Filled avatar and caret. */
  solid: string;
  /** Their selection, behind text. */
  wash: string;
  /** Their caret's outline on a cell they hold. */
  ring: string;
};

export const people = {
  ade: {
    name: 'Ade Okonjo',
    short: 'Ade',
    initials: 'AO',
    solid: 'bg-blue-600 text-white',
    wash: 'bg-blue-500/20',
    ring: 'ring-blue-600',
  },
  rae: {
    name: 'Rae Suzuki',
    short: 'Rae',
    initials: 'RS',
    solid: 'bg-violet-600 text-white',
    wash: 'bg-violet-500/20',
    ring: 'ring-violet-600',
  },
  mira: {
    name: 'Mira Halvorsen',
    short: 'Mira',
    initials: 'MH',
    solid: 'bg-rose-600 text-white',
    wash: 'bg-rose-500/20',
    ring: 'ring-rose-600',
  },
} satisfies Record<string, Person>;

/**
 * The range a comment is attached to. Deliberately not the commenter's own
 * hue: a red or violet wash behind a sentence reads as an error or a
 * selection, and this is neither.
 */
export const commentHighlight = 'bg-amber-400/25';

/** An entry's state, as a field on the model rather than a Stet concept. */
export type Status = { label: string; tone: string };

export const statuses = {
  live: {
    label: 'Live',
    tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  review: {
    label: 'In review',
    tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  draft: {
    label: 'Draft',
    tone: 'bg-muted text-muted-foreground',
  },
  scheduled: {
    label: 'Scheduled',
    tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
} satisfies Record<string, Status>;

/**
 * A series colour, mixed along the ramp so a chart reads as one gradient
 * rather than as a set of categories that mean something.
 */
export function rampColor(index: number, count: number): string {
  const stop = count < 2 ? 0 : (index / (count - 1)) * 100;
  return `color-mix(in oklch, var(--color-blue-600), var(--color-violet-600) ${stop}%)`;
}

/** Field types are grouped by what they hold, and each group gets a hue. */
export const fieldTones = {
  text: 'text-blue-600 dark:text-blue-400',
  value: 'text-emerald-600 dark:text-emerald-400',
  choice: 'text-amber-600 dark:text-amber-400',
  relation: 'text-violet-600 dark:text-violet-400',
} as const;

export type FieldTone = keyof typeof fieldTones;
