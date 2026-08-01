import node from '@astrojs/node';
import { stet } from '@stetcms/vite';
import { defineConfig } from 'astro/config';

// Astro builds on Vite, so the Stet integration is the same Vite plugin the
// TanStack example uses, passed through `vite.plugins`. No Astro-specific
// integration is needed.
//
// `output: 'server'` leaves other routes available on demand. The content
// pages opt into prerendering in their frontmatter.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [stet()],
  },
});
