import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/client.ts', 'src/server.ts', 'src/sync.ts'],
    platform: 'neutral',
    dts: { eager: true },
    publint: true,
  },
});
