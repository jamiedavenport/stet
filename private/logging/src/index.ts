import type { AuditableLogger, FieldContext } from 'evlog';
import { createLogger as createEvlogLogger } from 'evlog';
import { initWorkersLogger } from 'evlog/workers';

/**
 * The field vocabulary shared by every wide event in the repo, so a query like
 * `job.name = "send-welcome-email"` means the same thing wherever the event was
 * emitted. Every field is optional at the call site: evlog makes the shape
 * deeply partial, and each log sets only the subset it knows about.
 */
export type StetEvent = {
  user: { id: string };
  organization: { id: string };
  job: { name: string; messageId: string; attempt: number };
  cron: { name: string };
  document: { page: string; bytes: number };
  workflow: { name: string; instanceId: string };
  import: {
    runId: string;
    origin: string;
    pages: number;
    imported: number;
    failed: number;
  };
  webhook: {
    eventId: string;
    eventType: string;
    endpointId: string;
    responseStatus: number | null;
    delivered: number;
    failed: number;
  };
};

export type Logger = AuditableLogger<StetEvent>;

/**
 * What `set()` and `emit()` accept, and what the initial context is checked
 * against. evlog types the initial context as `Record<string, unknown>`, which
 * would leave the fields most call sites open with — the job, cron, and webhook
 * identifiers — unchecked.
 */
export type StetEventContext = FieldContext<StetEvent>;

export type InitLoggingOptions = {
  service: string;
  /**
   * Passed explicitly because evlog falls back to `process.env.NODE_ENV`, which
   * workerd does not set. Getting this wrong is not cosmetic: auto-redaction of
   * PII is only on outside development.
   */
  production: boolean;
};

/**
 * Configures the logger for the whole isolate. Call once at module scope in the
 * worker entry, before any handler can run.
 */
export function initLogging(options: InitLoggingOptions): void {
  initWorkersLogger({
    env: {
      service: options.service,
      environment: options.production ? 'production' : 'development',
    },
    redact: options.production,
  });
}

/**
 * Starts a wide event for one unit of background work. Accumulate context with
 * `set()` as the work progresses, then `emit()` exactly once in a `finally` so
 * failures are recorded as well as successes.
 *
 * @example
 * ```ts
 * const log = createLogger({ cron: { name: 'cleanup-auth' } });
 * try {
 *   log.set({ organization: { id } });
 * } finally {
 *   log.emit();
 * }
 * ```
 */
export function createLogger(context?: StetEventContext): Logger {
  // evlog's parameter is Record<string, unknown>, which StetEventContext does
  // not satisfy for want of an index signature. The cast is the whole reason
  // this wrapper exists: it is what puts the initial context under the same
  // vocabulary as set() and emit().
  return createEvlogLogger<StetEvent>(context as Record<string, unknown> | undefined);
}

/**
 * A failure that is part of normal operation, thrown where an exception is the
 * only way to ask for a retry: a customer's webhook endpoint being down, say.
 * It belongs in the logs, but not in Sentry, which is for defects someone
 * should act on — five queue attempts against a dead URL are not five bugs.
 */
export class ExpectedFailure extends Error {
  override readonly name = 'ExpectedFailure';
}
