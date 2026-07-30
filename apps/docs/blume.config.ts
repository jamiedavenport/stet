import { brand } from '@repo/brand';
import { defineConfig } from 'blume';

export default defineConfig({
  title: brand.name,
  description: brand.description,
  // Inlined by Blume, and rewritten to currentColor by scripts/brand-assets.ts,
  // so the wordmark follows the theme. It already carries the name, so the
  // header renders no second one.
  logo: { image: '/logo.svg', text: '' },

  // Cloudflare Workers exposes no deploy URL at build time, and canonical
  // links, the sitemap, OG images and llms.txt all need an absolute origin.
  deployment: { site: brand.docs },

  github: { owner: 'jamiedavenport', repo: 'stet', branch: 'main', dir: 'apps/docs' },

  navigation: {
    repo: true,
    tabs: [
      { label: 'Guides', path: '/', icon: 'book-open' },
      { label: 'Reference', path: '/reference', icon: 'code' },
      { label: 'API', path: '/api', icon: 'webhook' },
    ],
  },

  openapi: {
    enabled: true,
    // Generated from the oRPC contract by `pnpm generate:openapi` in
    // private/api, so the reference always matches the deployed contract.
    sources: [{ spec: '../../private/api/openapi.json', label: 'API', route: '/api' }],
    codeSamples: ['curl', 'js'],
  },
});
