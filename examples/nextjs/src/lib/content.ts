import 'server-only';

import { connection } from 'next/server';

import { stet } from './stet';

export function hasStetApiKey(): boolean {
  return process.env.STET_API_KEY !== undefined && process.env.STET_API_KEY !== '';
}

// Keep keyless requests dynamic so a runtime key is not masked by cached fallbacks.
async function useKeylessFallback() {
  await connection();
}

export async function getLanding() {
  if (!hasStetApiKey()) {
    await useKeylessFallback();
    return undefined;
  }
  return stet.landing.get();
}

export async function listPosts() {
  if (!hasStetApiKey()) {
    await useKeylessFallback();
    return [];
  }
  return stet.posts.list();
}

export async function getPost(slug: string) {
  if (!hasStetApiKey()) {
    await useKeylessFallback();
    return undefined;
  }
  return stet.posts.get(slug);
}
