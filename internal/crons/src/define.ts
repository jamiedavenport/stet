import type { Logger } from '@repo/logging';

// Cron handlers reach the database through `database()` from @repo/db and
// enqueue work through the job client. They are given the run's logger so what
// they did folds into the one event the run already emits, rather than printing
// a line of its own.
export type CronHandler = (log: Logger) => Promise<void>;
