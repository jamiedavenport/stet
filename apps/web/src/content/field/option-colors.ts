import type { OptionColor } from '@repo/content/schema';

/** Chip styling for a select option, keyed by its stored color. */
export const optionColorClasses: Record<OptionColor, string> = {
  gray: 'bg-muted text-muted-foreground',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  green: 'bg-green-500/15 text-green-700 dark:text-green-300',
  yellow: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300',
  purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  pink: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
};

/** The swatch shown beside an option in editors. */
export const optionDotClasses: Record<OptionColor, string> = {
  gray: 'bg-muted-foreground',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};
