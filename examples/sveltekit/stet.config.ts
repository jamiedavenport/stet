import { defineStet } from '@stetcms/config';

// Everything about this app's Stet integration. `@stetcms/vite` reads it to
// generate the typed content client, and `stet generate` reads the same file,
// so the two never disagree.
//
// The generated client goes under src/lib/server, so SvelteKit itself refuses
// to bundle it into client code: content can only be fetched where the API
// key lives.
//
// No secrets here: STET_API_KEY is read from the environment, which is why
// this file is safe to commit.

export default defineStet({
  origin: process.env.STET_ORIGIN ?? 'http://localhost:3000',
  output: 'src/lib/server/stet.gen.ts',
});
