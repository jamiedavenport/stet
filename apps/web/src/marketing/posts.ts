import { log } from '@repo/logging';

import { stet } from '#/stet.gen';
import type { PostsEntry } from '#/stet.gen';

const excerptLength = 200;

/**
 * Stands in for an entry whose Summary field nobody filled in, so a feed and
 * a search result still say something about the post.
 */
function excerpt(body: string): string {
  const [paragraph = ''] = body.trim().split(/\n{2,}/, 1);
  const text = paragraph
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll(/[#*_`>]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return text.length > excerptLength ? `${text.slice(0, excerptLength).trimEnd()}…` : text;
}

/** What a post says about itself, from the Summary field or its opening line. */
export function postSummary(post: PostsEntry): string {
  return post.fields.summary ?? excerpt(post.fields.body?.markdown ?? '');
}

/** `YYYY-MM-DD`, from the Published field or the day the entry was created. */
export function postDate(post: PostsEntry): string {
  return post.fields.published ?? post.createdAt.slice(0, 10);
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
export async function listPosts(): Promise<PostsEntry[]> {
  const posts = await orEmpty(() => stet.posts.list(), []);
  return posts.toSorted((a, b) => postDate(b).localeCompare(postDate(a)));
}

/** One post, or undefined if there is no such entry. */
export function findPost(slug: string): Promise<PostsEntry | undefined> {
  return orEmpty<PostsEntry | undefined>(() => stet.posts.get(slug), undefined);
}
