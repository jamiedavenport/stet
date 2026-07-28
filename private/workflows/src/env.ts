import type { D1Database } from '@cloudflare/workers-types';

// What workflow steps need from the worker environment. The real Env
// (apps/web) satisfies this structurally.
export type WorkflowsEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  MAIL_FROM: string;
  BETTER_AUTH_URL: string;
  // Signs the one-click unsubscribe token in reminder emails.
  BETTER_AUTH_SECRET: string;
  // Read by the Sentry wrapper around the workflow class, which initializes
  // the SDK per run because a workflow executes outside the fetch handler.
  SENTRY_DSN: string;
};
