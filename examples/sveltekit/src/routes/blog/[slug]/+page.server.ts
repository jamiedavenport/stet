import { stet } from '$lib/server/stet.gen';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return { post: await stet.posts.get(params.slug) };
};
