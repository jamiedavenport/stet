import 'server-only';

import { connection } from 'next/server';

import { stet } from './stet';

export function hasStetApiKey(): boolean {
  return process.env.STET_API_KEY !== undefined && process.env.STET_API_KEY !== '';
}

export async function getLanding() {
  if (!hasStetApiKey()) {
    await connection();
    return undefined;
  }
  return stet.landing.get();
}

export async function listPosts() {
  if (!hasStetApiKey()) {
    await connection();
    return [];
  }
  return stet.posts.list();
}

export async function getPost(slug: string) {
  if (!hasStetApiKey()) {
    await connection();
    return undefined;
  }
  return stet.posts.get(slug);
}
