import { stet } from '@stetcms/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [
    // Reads stet.config.ts: regenerates src/lib/server/stet.gen.ts from the
    // content model on every dev-server and build start. Reads STET_API_KEY
    // from the environment; without it the committed generated client keeps
    // working.
    stet(),
    sveltekit(),
  ],
});
