import { describe, expect, it } from 'vite-plus/test';

import { groupUrls } from './discover';
import { entrySlugFromUrl } from './plan';

const origin = 'https://example.com';

describe('groupUrls', () => {
  it('keeps single-page sections as groups and attaches their hub', () => {
    const groups = groupUrls(origin, [
      `${origin}/blog/one`,
      `${origin}/blog/two`,
      `${origin}/blog/three`,
      `${origin}/blog`,
      `${origin}/insights/only-post`,
      `${origin}/insights`,
      `${origin}/about`,
      `${origin}/`,
    ]);

    expect(groups.map((group) => group.pattern)).toEqual([
      '/blog/*',
      '/insights/*',
      'Top-level pages',
    ]);
    // A one-post blog is still a collection candidate, and its index page is
    // context rather than an entry.
    expect(groups[1].urls).toEqual([`${origin}/insights/only-post`]);
    expect(groups[1].hubUrl).toBe(`${origin}/insights`);
    expect(groups[0].hubUrl).toBe(`${origin}/blog`);
    // Claimed hubs leave the top-level pool; true one-offs stay.
    expect(groups[2].urls).toEqual([`${origin}/`, `${origin}/about`]);
  });
});

describe('entrySlugFromUrl', () => {
  it('keeps the source permalink slug', () => {
    expect(entrySlugFromUrl('https://example.com/blog/hello-world/')).toBe('hello-world');
    expect(entrySlugFromUrl('https://example.com/')).toBeNull();
  });
});
