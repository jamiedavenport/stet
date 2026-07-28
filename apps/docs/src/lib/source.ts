import { loader } from 'fumadocs-core/source';
import { docs } from 'collections/server';
import { Gem } from 'lucide-react';
import { createElement } from 'react';
import { docsRoute } from './shared';
import { openapi } from './openapi';

// An explicit map instead of `lucideIconsPlugin()`, which barrel-imports the
// whole icon set (1.19 MiB) to resolve the handful of names actually used.
const icons = { Gem };

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({
      baseDir: 'openapi',
    }),
  },
  {
    baseUrl: docsRoute,
    icon(name) {
      if (name && name in icons) return createElement(icons[name as keyof typeof icons]);
    },
    plugins: [openapi.loaderPlugin()],
  },
);

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) return [];

  const out = [...segs];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return {
    segments,
    url: `/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  if (page.type === 'openapi') return JSON.stringify(page.data.getSchema(), null, 2);

  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
