import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import mdx from 'fumadocs-mdx/vite';
import Sonda from 'sonda/vite';
import { defineConfig } from 'vite-plus';

const analyze = process.env.ANALYZE === '1';

const config = defineConfig({
  server: {
    // Off web's port (3000) so both apps run side by side locally.
    port: Number(process.env.PORT ?? 3100),
  },
  build: {
    // Sonda reads sourcemaps to attribute bundle bytes to packages.
    sourcemap: analyze,
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      'fumadocs-core/highlight/shiki/full': fileURLToPath(
        new URL('./src/lib/shiki-full.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    mdx(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    ...(analyze ? [Sonda()] : []),
  ],
});

// The oxc transform picks the development JSX runtime (jsxDEV) from NODE_ENV.
// `vp run` sets it to "development" (and sometimes the string "null") before
// loading this config, so it must be assigned unconditionally: `??=` sees a
// non-nullish value and leaves the dev runtime in production bundles.
export default defineConfig(({ command }) => {
  process.env.NODE_ENV = command === 'build' ? 'production' : 'development';
  return config;
});
