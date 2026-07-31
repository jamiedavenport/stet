import { brand } from '@repo/brand';
import { log } from '@repo/logging';
import { marked } from 'marked';

import { stet } from '#/stet.gen';
import type { PostsEntry } from '#/stet.gen';

/**
 * A blog post as the marketing pages read it, flattened out of the Stet entry
 * so a page never reaches through `fields` and every optional value has been
 * resolved once. Fetch through `#/marketing/content` from a route: this module
 * holds the API key and talks to Stet directly.
 */
export type PostSummary = {
  slug: string;
  title: string;
  summary: string;
  /** `YYYY-MM-DD`, so posts sort lexicographically. */
  date: string;
  author: string;
  tags: string[];
  /** Whole minutes, never zero. */
  readingTime: number;
};

/** A post with its body rendered. */
export type Post = PostSummary & { html: string };

const excerptLength = 200;
const wordsPerMinute = 220;

/** Stands in for an entry whose Summary field nobody filled in. */
function excerpt(body: string): string {
  const [paragraph = ''] = body.trim().split(/\n{2,}/, 1);
  const text = paragraph
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll(/[#*_`>]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return text.length > excerptLength ? `${text.slice(0, excerptLength).trimEnd()}…` : text;
}

function readingTime(body: string): number {
  const words = body.trim() === '' ? 0 : body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

function toSummary(entry: PostsEntry): PostSummary {
  const body = entry.fields.body ?? '';
  return {
    slug: entry.slug,
    title: entry.title,
    summary: entry.fields.summary ?? excerpt(body),
    date: entry.fields.published ?? entry.createdAt.slice(0, 10),
    author: entry.fields.author?.name ?? brand.author.name,
    tags: entry.fields.tags ?? [],
    readingTime: readingTime(body),
  };
}

/**
 * Reading content must not take a page down, and a deployment with no
 * `STET_API_KEY` is the documented local and CI default rather than a fault,
 * so both read as an empty blog.
 */
async function orEmpty<T>(read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    log.warn('content', `Stet returned no posts: ${String(error)}`);
    return empty;
  }
}

/** Every post, newest first. */
export async function listPosts(): Promise<PostSummary[]> {
  const entries = await orEmpty(() => stet.posts.list(), []);
  return entries.map(toSummary).toSorted((a, b) => b.date.localeCompare(a.date));
}

/** One post with its body as HTML, or undefined if there is no such entry. */
export async function findPost(slug: string): Promise<Post | undefined> {
  const entry = await orEmpty<PostsEntry | undefined>(() => stet.posts.get(slug), undefined);
  if (entry === undefined) {
    return undefined;
  }
  // Rendered here rather than in the browser: nothing but our own editor
  // writes these bodies, and the markdown stays out of the client bundle.
  return { ...toSummary(entry), html: marked.parse(entry.fields.body ?? '', { async: false }) };
}
