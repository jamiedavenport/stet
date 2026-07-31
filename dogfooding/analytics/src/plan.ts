import { defineAnalytics, event } from '@stetcms/analytics';
import { z } from 'zod';

// Stet's own tracking plan, on Stet. Client-safe: no secrets and no server
// imports, so the browser client types itself from the same source the Worker
// validates against.
//
// Identity is not part of an event's props. The browser never sends it at all:
// the route handler reads the session server-side and stamps userId and
// organizationId onto the batch, and capture() takes them as its own options.
// Schemas here only describe what happened.

/** @see https://docs.stetcms.com/analytics */
export const analytics = defineAnalytics({
  events: {
    /** An account was created. */
    signup: event(),
    organization: {
      /** An organization was created, by the user in `userId`. */
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
