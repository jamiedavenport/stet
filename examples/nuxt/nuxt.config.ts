import { fileURLToPath } from 'node:url';
import { stet } from '@stetcms/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  css: ['~/assets/main.css'],
  vite: {
    plugins: [
      // Reads stet.config.ts: regenerates server/stet.gen.ts from the content
      // model and publishes the tracking plan, on every dev-server and build
      // start. Reads STET_API_KEY from the environment; without it the
      // committed generated client keeps working.
      //
      // Both paths are explicit because Nuxt points Vite's root at app/,
      // where the plugin's auto-detection would not find stet.config.ts.
      stet({
        config: fileURLToPath(new URL('stet.config.ts', import.meta.url)),
        output: fileURLToPath(new URL('server/stet.gen.ts', import.meta.url)),
      }),
    ],
  },
});
