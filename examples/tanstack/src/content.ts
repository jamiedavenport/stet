import { createServerFn } from '@tanstack/react-start';

import { stet } from './stet.gen';

// Content is fetched through server functions so the organization API key
// (STET_API_KEY) never reaches the browser.

export const fetchLanding = createServerFn({ method: 'GET' }).handler(() => stet.landing.get());

export const fetchPosts = createServerFn({ method: 'GET' }).handler(() => stet.posts.list());

export const fetchPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(({ data }) => stet.posts.get(data));
