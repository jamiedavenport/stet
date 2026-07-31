import { createServerFn } from '@tanstack/react-start';

import { findPost, listPosts } from '#/marketing/posts';

// Route loaders run in the browser as well as the worker, so they reach Stet
// through server functions: the organization API key stays on the server, the
// same way a customer's own app would read its content.

export const fetchPosts = createServerFn({ method: 'GET' }).handler(() => listPosts());

export const fetchPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(({ data }) => findPost(data));
