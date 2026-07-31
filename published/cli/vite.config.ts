import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // `vp pack` reads the `#/` paths from tsconfig.json; the test runner does not.
  resolve: {
    alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  pack: {
    entry: ['src/index.ts'],
    platform: 'node',
    publint: true,
  },
  run: {
    tasks: {
      dev: {
        // The workspace client resolves to its TypeScript source, so this
        // single watcher rebundles the CLI with current client code on every
        // change to the CLI's own files. No dependency builds needed.
        command: 'vp pack --watch',
        cache: false,
      },
    },
  },
});
