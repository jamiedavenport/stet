import { cronExpressions } from './schedule.ts';

// Wrangler `triggers.crons` derived from the schedule. Merged into the
// worker config by apps/web/vite.config.ts, so adding a cron never requires
// touching wrangler.jsonc. The .ts extension is required because Node loads
// this module directly at vite config time.
export function cronsConfig(): string[] {
  return [...cronExpressions];
}
