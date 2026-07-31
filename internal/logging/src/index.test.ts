import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createLogger, initLogging } from './index';

// evlog routes each event to the console method named after its level, so an
// info event never reaches a console.log spy.
function captureInfo() {
  return vi.spyOn(console, 'info').mockImplementation(() => {});
}

function captureError() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('initLogging', () => {
  it('logs objects rather than JSON strings so Workers Logs indexes the fields', () => {
    initLogging({ service: 'stet-web', production: true });
    const info = captureInfo();

    createLogger({ cron: { name: 'cleanup-auth' } }).emit();

    const [event] = info.mock.calls[0] as [unknown];
    expect(event).toMatchObject({ service: 'stet-web', cron: { name: 'cleanup-auth' } });
  });

  it('redacts PII in production', () => {
    initLogging({ service: 'stet-web', production: true });
    const error = captureError();

    const log = createLogger({ job: { name: 'send-welcome-email' } });
    log.error(new Error('no mailbox for someone@example.com'));
    log.emit();

    expect(JSON.stringify(error.mock.calls[0])).not.toContain('someone@example.com');
  });
});

// evlog types its own initial context as Record<string, unknown>, so these
// would all have compiled before @repo/logging narrowed it. The fields most
// call sites open with live there, so the checks matter most exactly here.
describe('the field vocabulary', () => {
  it('rejects unknown and mistyped fields wherever they are set', () => {
    // @ts-expect-error unknown field in the initial context
    createLogger({ jbo: { name: 'send-welcome-email' } });
    // @ts-expect-error wrong type in the initial context
    createLogger({ job: { attempt: 'first' } });
    // @ts-expect-error unknown nested field
    createLogger().set({ job: { nmae: 'send-welcome-email' } });
    // @ts-expect-error unknown field on emit
    createLogger().emit({ jbo: 1 });

    expect(() => createLogger({ job: { name: 'send-welcome-email' } })).not.toThrow();
  });
});

describe('createLogger', () => {
  it('accumulates context across a unit of work into one event', () => {
    initLogging({ service: 'stet-web', production: false });
    const info = captureInfo();

    const log = createLogger({ job: { name: 'send-welcome-email' } });
    log.set({ job: { attempt: 2 } });
    log.set({ organization: { id: 'org-1' } });
    log.emit({ status: 200 });

    expect(info).toHaveBeenCalledOnce();
    expect(info.mock.calls[0][0]).toMatchObject({
      job: { name: 'send-welcome-email', attempt: 2 },
      organization: { id: 'org-1' },
      status: 200,
    });
  });

  it('records a failure on the same event the work started', () => {
    initLogging({ service: 'stet-web', production: false });
    const error = captureError();

    const log = createLogger({ job: { name: 'deliver-webhook' } });
    log.error(new Error('endpoint refused the connection'));
    log.emit();

    expect(error.mock.calls[0][0]).toMatchObject({
      level: 'error',
      job: { name: 'deliver-webhook' },
    });
  });
});
