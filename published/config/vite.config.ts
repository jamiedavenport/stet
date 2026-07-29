import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    platform: 'neutral',
    dts: { eager: true },
    publint: true,
  },
});
