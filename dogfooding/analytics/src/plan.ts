import { defineAnalytics, event } from '@stetcms/analytics';
import { z } from 'zod';

// Identity is deliberately not in the schemas: the mounted route reads it from
// the session, and capture() takes it as context, so these describe only what
// happened.
export const analytics = defineAnalytics({
  events: {
    signup: event(),
    organization: {
      created: event(),
    },
    subscription: {
      /** `plan` is a plan name from the billing catalog (see @repo/billing). */
      started: event({ plan: z.string() }),
      canceled: event({ plan: z.string() }),
    },
  },
});

export type Analytics = typeof analytics;
