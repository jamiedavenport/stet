// The cron expressions the worker runs on. Data-only on purpose: this module
// is loaded by Node when apps/web/vite.config.ts generates the wrangler
// `triggers` config, so it must never import handler code. The registry
// enforces one handler per expression at compile time.
export const cronExpressions = ['0 3 * * *', '30 3 * * *', '15 * * * *'] as const;

export type CronExpression = (typeof cronExpressions)[number];
