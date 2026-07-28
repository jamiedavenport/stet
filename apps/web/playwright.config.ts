import { defineConfig, devices } from '@playwright/test';

// Overridable for worktrees and CI runners where port 3000 is taken; must
// match the port the dev server actually binds (and BETTER_AUTH_URL).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The GitHub runner has two cores, so Playwright's default (half of them)
  // runs the whole suite serially. These tests wait on a dev server far more
  // than they compute, so a second worker nearly halves the wall clock.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // The auth pages render on the client, so a first visit waits on the dev
  // server compiling the route. The default 5s is enough until several
  // workers ask at once; a retry costs far more than the headroom.
  expect: { timeout: 10_000 },
  // Drop {platform}: resvg-wasm renders identically on every OS, so one
  // snapshot is the baseline everywhere. A browser screenshot would not be.
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    // Seeds the database and saves an authenticated storage state.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    // Auth flow tests run in a fresh, unauthenticated context.
    {
      name: 'auth',
      // Anchored to the basename: an unanchored pattern would also match the
      // checkout path (e.g. a worktree directory containing "auth").
      testMatch: /\/auth(-email)?\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Public routes, no DB seed or auth.
    {
      name: 'og',
      testMatch: /\/og\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'marketing',
      testMatch: /\/marketing\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Header, captcha, and rate-limit assertions on anonymous responses: no
    // seeded data and no session, so they run without waiting for setup.
    {
      name: 'security',
      testMatch: /\/security\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Everything else starts already signed in via the saved storage state.
    {
      name: 'app',
      testIgnore: /\/(auth(-email)?|og|marketing|security)\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    // Output is teed to a file so tests can read emailed links from the
    // mailer's dev-mode skip log (see e2e/mail.ts).
    command: 'pnpm dev 2>&1 | tee e2e/.server.log',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
