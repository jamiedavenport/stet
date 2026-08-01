import node from '@astrojs/node';
import { stet } from '@stetcms/vite';
import { defineConfig } from 'astro/config';

// Astro builds on Vite, so the Stet integration is the same Vite plugin the
// TanStack example uses, passed through `vite.plugins`. No Astro-specific
// integration is needed.
//
// `output: 'server'` renders every page on demand, which keeps content reads
// at request time (an edit in Stet shows up on the next refresh) and means
// `astro build` never needs a running Stet.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [stet()],
  },
});
