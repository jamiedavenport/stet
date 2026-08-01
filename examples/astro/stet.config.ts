import { defineAnalytics, event } from '@stetcms/analytics';
import { defineStet } from '@stetcms/config';
import { z } from 'zod';

// Everything about this app's Stet integration. `@stetcms/vite` reads it to
// generate the typed content client and to publish the tracking plan, and
// `stet generate` / `stet sync` read the same file, so the two never disagree.
//
// No secrets here: STET_API_KEY is read from the environment, which is why
// this file is safe to commit.

export default defineStet({
  origin: process.env.STET_ORIGIN ?? 'http://localhost:3000',
  output: 'src/stet.gen.ts',
  analytics: defineAnalytics({
    events: {
      post: {
        /** A post was opened. `slug` is the entry it came from in Stet. */
        read: event({ slug: z.string() }),
        /** A reader reached the end of one. */
        finished: event({ slug: z.string() }),
      },
      subscribe: event({ placement: z.enum(['banner', 'footer']) }),
    },
  }),
});
