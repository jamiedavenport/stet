import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ignorePatterns: ['**/routeTree.gen.ts', '**/stet.gen.ts', 'internal/api/openapi.json'],
    semi: true,
    singleQuote: true,
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },
  run: {
    cache: true,
  },
  staged: {
    '*.{ts,tsx}': 'vp check --fix',
  },
});
