// Cron handlers take no arguments: they reach the database through
// `database()` from @repo/db and enqueue work through the job client.
export type CronHandler = () => Promise<void>;
