import { stet } from '$lib/server/stet.gen';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return { posts: await stet.posts.list() };
};
