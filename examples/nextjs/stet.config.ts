import { defineStet } from '@stetcms/config';

// Everything about this app's Stet integration: where Stet is and where the
// generated client goes. `stet generate` reads it, so the build script and a
// by-hand run can never disagree.
//
// No secrets here: STET_API_KEY is read from the environment, which is why
// this file is safe to commit.

export default defineStet({
  origin: process.env.STET_ORIGIN ?? 'http://localhost:3000',
  output: 'src/stet.gen.ts',
});
