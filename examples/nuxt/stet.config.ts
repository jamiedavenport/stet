import { defineStet } from '@stetcms/config';

// Everything about this app's Stet integration: where Stet is and where the
// generated client goes. `@stetcms/vite` reads it to generate the typed
// content client, and `stet generate` reads the same file, so the two never
// disagree.
//
// No secrets here: STET_API_KEY is read from the environment, which is why
// this file is safe to commit.

export default defineStet({
  origin: process.env.STET_ORIGIN ?? 'http://localhost:3000',
  output: 'server/stet.gen.ts',
});
