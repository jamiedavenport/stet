import fs from 'node:fs/promises';
import path from 'node:path';

// Playwright's webServer tees dev-server output into this file (see
// playwright.config.ts). Without RESEND_API_KEY the mailer logs each email
// instead of sending it, including the primary action link in parentheses,
// so e2e tests can intercept emailed links without a mailbox.
const logFile = path.join(import.meta.dirname, '.server.log');

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function waitForEmailLink(kind: string, to: string): Promise<string> {
  const pattern = new RegExp(
    `\\[mail\\][^\\n]*skipping ${escapeRegExp(kind)} email to ${escapeRegExp(to)}:[^\\n]*\\((https?://[^)]+)\\)`,
  );
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const log = await fs.readFile(logFile, 'utf8').catch(() => null);
    if (log === null) {
      // tee creates the file as soon as Playwright boots the server, so a
      // missing file means an externally started server was reused and its
      // output is not captured. Waiting will not help; fail with guidance.
      throw new Error(
        `${logFile} not found. Mail e2e tests read emailed links from the dev server ` +
          'log, which is only captured when Playwright starts the server itself. ' +
          'Stop the manually started dev server and re-run the tests.',
      );
    }
    const match = log.match(pattern);
    if (match) {
      return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for a "${kind}" email to ${to} in ${logFile}`);
}
