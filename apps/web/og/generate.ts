import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { brand } from '@repo/brand';
import { createOgHandler } from '@jxdltd/tanstack/og/server';

import { features } from '../src/marketing/data/features';
import { personas } from '../src/marketing/data/personas';
import { rivals } from '../src/marketing/data/rivals';
import config, { ogPosts } from './config';
import template from './template';

// Each dynamic config key expands from the data behind it, so a new post,
// feature, persona or comparison gets its image without touching this file.
const expansions: Record<string, string[]> = {
  '/blog/$slug': (await ogPosts()).map((post) => `/blog/${post.slug}`),
  '/features/$slug': features.map((feature) => `/features/${feature.slug}`),
  '/for/$persona': personas.map((persona) => `/for/${persona.slug}`),
  '/compare/$rival': rivals.map((rival) => `/compare/${rival.slug}`),
};

const paths = Object.keys(config).flatMap((key) => {
  if (key === '/') {
    return ['/index'];
  }
  return expansions[key] ?? [key.replace(/\/$/, '')];
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
