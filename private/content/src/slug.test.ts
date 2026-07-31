import { describe, expect, it } from 'vite-plus/test';

import { isDerivedSlug, slugify, uniqueSlug } from './slug';

// `isDerivedSlug` is what decides whether a rename moves an entry's public
// handle, so its edges are worth pinning down.

describe('isDerivedSlug', () => {
  it('recognises the slug a name produces', () => {
    expect(isDerivedSlug('hello-world', 'Hello world')).toBe(true);
    expect(isDerivedSlug('untitled', 'Untitled')).toBe(true);
  });

  it('treats the disambiguating suffix as still derived', () => {
    expect(isDerivedSlug('hello-world-2', 'Hello world')).toBe(true);
    expect(isDerivedSlug('hello-world-10', 'Hello world')).toBe(true);
  });

  it('rejects a slug somebody chose', () => {
    expect(isDerivedSlug('hello', 'Hello world')).toBe(false);
    expect(isDerivedSlug('hello-world-launch', 'Hello world')).toBe(false);
  });

  it('rejects a suffix that is not one uniqueSlug would have added', () => {
    // `-1` is never appended: the first collision goes to `-2`.
    expect(isDerivedSlug('hello-world-1', 'Hello world')).toBe(false);
    expect(isDerivedSlug('hello-world-0', 'Hello world')).toBe(false);
  });

  it('holds for a name whose own slug ends in a number', () => {
    expect(isDerivedSlug('part-2', 'Part 2')).toBe(true);
    expect(isDerivedSlug('part-2-2', 'Part 2')).toBe(true);
  });

  it('agrees with what slugify and uniqueSlug actually produce', () => {
    const title = 'Both teams at full speed';
    expect(isDerivedSlug(slugify(title), title)).toBe(true);
    expect(isDerivedSlug(uniqueSlug(slugify(title), new Set([slugify(title)])), title)).toBe(true);
  });
});
