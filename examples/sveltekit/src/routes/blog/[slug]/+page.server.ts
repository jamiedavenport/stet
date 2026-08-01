import { stet } from '$lib/server/stet.gen';

import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = async () => {
  if (process.env.STET_API_KEY === undefined || process.env.STET_API_KEY === '') {
    return [];
  }
  const posts = await stet.posts.list();
  return posts.map((post) => ({ slug: post.slug }));
};

export const load: PageServerLoad = async ({ params }) => {
  return { post: await stet.posts.get(params.slug) };
};
