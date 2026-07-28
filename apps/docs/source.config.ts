import {
  createRehypeCode,
  rehypeCodeDefaultOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code.core';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { shikiFactory, shikiThemes } from './src/lib/highlighter';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

// Resolved here rather than inside the plugin: the highlighter loads its
// grammars with dynamic imports, and Vite's module runner has closed by the
// time rehype first runs.
const highlighter = await shikiFactory.getOrInit();

// Replaces Fumadocs' built-in rehypeCode, which reaches for the full `shiki`
// bundle entry. `lazy: false` keeps it off `getBundledLanguages()`, so no
// grammar outside the highlighter's `langs` is ever linked.
const rehypeCode = createRehypeCode(async (options) => ({
  highlighter,
  options: {
    ...rehypeCodeDefaultOptions(),
    themes: shikiThemes,
    lazy: false,
    langs: [],
    ...options,
  },
}));

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: false,
    rehypePlugins: (plugins) => [rehypeCode, ...plugins],
  },
});
