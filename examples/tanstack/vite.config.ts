import { stet } from '@stetcms/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [
    // Reads stet.config.ts: regenerates src/stet.gen.ts from the content
    // model and publishes the tracking plan, on every dev-server and build
    // start. Reads STET_API_KEY from the environment; without it the
    // committed generated client keeps working.
    stet(),
    tanstackStart(),
    viteReact(),
  ],
});
