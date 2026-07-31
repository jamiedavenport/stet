import { execSync } from 'node:child_process';
import path from 'node:path';

import { seedUser } from '@repo/db/seed-data';
import { expect, test as setup } from '@playwright/test';

import { captchaTestHeader, freshStorageState, signIn } from './helpers';

const authFile = path.join(import.meta.dirname, '.auth/user.json');

setup('seed database and persist auth state', async ({ page, request }) => {
  // The first navigations after a fresh dev-server boot compile routes on
  // demand, which blows the default timeouts (CI burned both retries here
  // before passing on a warm server).
  setup.setTimeout(120_000);
  // Pre-accept consent so the banner never overlays controls here, and so
  // the saved auth state carries the decision into every spec that reuses
  // it. consent.spec covers the banner itself from a bare context.
  await page.context().addCookies(freshStorageState().cookies);
  // On a fresh checkout miniflare only creates the local D1 sqlite file once a
  // request touches the database, so hit an auth endpoint before seeding. The
  // Origin header matters: better-auth rejects the request before querying the
  // database without it.
  await request.post('/api/auth/sign-in/email', {
    data: { email: seedUser.email, password: 'warm-up-request' },
    headers: { origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000', ...captchaTestHeader },
  });

  execSync('pnpm --filter @repo/seed seed', {
    cwd: path.resolve(import.meta.dirname, '../../..'),
    stdio: 'inherit',
  });

  await signIn(page, seedUser.email, seedUser.password);
  await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible({ timeout: 60_000 });

  await page.context().storageState({ path: authFile });
});
