import 'server-only';

import { stet } from './stet';

function hasStetApiKey(): boolean {
  return process.env.STET_API_KEY !== undefined && process.env.STET_API_KEY !== '';
}

export async function getLanding() {
  if (!hasStetApiKey()) {
    return undefined;
  }
  return stet.landing.get();
}

export async function listPosts() {
  if (!hasStetApiKey()) {
    return [];
  }
  return stet.posts.list();
}

export async function getPost(slug: string) {
  if (!hasStetApiKey()) {
    return undefined;
  }
  return stet.posts.get(slug);
}
