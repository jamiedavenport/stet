import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { brand } from '@repo/brand';
import { createOgHandler } from '@jxdltd/tanstack/og/server';

import { sortedPosts } from '../src/marketing/content';
import config from './config';
import template from './template';

// Static config keys are the page paths; the dynamic blog pattern expands
// from content, so a new post gets its image without touching this file.
const paths = Object.keys(config).flatMap((key) => {
  if (key === '/') {
    return ['/index'];
  }
  if (key === '/blog/$slug') {
    return sortedPosts().map((post) => `/blog/${post.slug}`);
  }
  return [key.replace(/\/$/, '')];
});

const handler = createOgHandler({ config, template });
const outDir = new URL('../public/og/', import.meta.url);

for (const path of paths) {
  const response = await handler({ request: new Request(`${brand.url}/og${path}.png`) });
  if (response.status !== 200) {
    throw new Error(`[og] ${path} rendered with status ${response.status}`);
  }
  const file = fileURLToPath(new URL(`.${path}.png`, outDir));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
}

console.log(`[og] rendered ${paths.length} images into public/og`);
