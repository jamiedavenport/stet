import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'astro build',
        env: ['STET_API_KEY', 'STET_ORIGIN'],
      },
    },
  },
});
