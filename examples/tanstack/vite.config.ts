import { stet } from '@stetcms/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [
    // Regenerates src/stet.gen.ts from the content model on every dev-server
    // and build start. Reads STET_API_KEY from the environment; without it
    // the committed generated client keeps working.
    stet({ origin: process.env.STET_ORIGIN ?? 'http://localhost:3000' }),
    tanstackStart(),
    viteReact(),
  ],
});
