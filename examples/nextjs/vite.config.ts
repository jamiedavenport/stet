import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: ['stet generate --if-key', 'next build'],
        env: ['STET_API_KEY', 'STET_ORIGIN'],
      },
    },
  },
});
