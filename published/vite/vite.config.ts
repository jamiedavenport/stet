import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/config.ts'],
    platform: 'node',
    dts: { eager: true },
    publint: true,
  },
});
