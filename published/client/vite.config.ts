import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/codegen.ts'],
    platform: 'neutral',
    dts: { eager: true },
    publint: true,
  },
});
