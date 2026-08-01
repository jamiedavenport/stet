import { stet } from '~~/server/stet.gen';

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug');
  if (slug === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' });
  }
  return stet.posts.get(slug);
});
