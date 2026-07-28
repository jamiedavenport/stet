import { allPosts, allReleases } from 'content-collections';
import type { Post, Release } from 'content-collections';

// Dates are `YYYY-MM-DD` (see content-collections.ts), so they order
// lexicographically. `toSorted` leaves the generated arrays untouched.
function newestFirst<T extends { date: string }>(items: T[]): T[] {
  return items.toSorted((a, b) => b.date.localeCompare(a.date));
}

/** All blog posts, newest first. */
export function sortedPosts(): Post[] {
  return newestFirst(allPosts);
}

export function latestPosts(count: number): Post[] {
  return sortedPosts().slice(0, count);
}

export function findPost(slug: string): Post | undefined {
  return allPosts.find((post) => post.slug === slug);
}

/** All changelog releases, newest first. */
export function sortedReleases(): Release[] {
  return newestFirst(allReleases);
}
