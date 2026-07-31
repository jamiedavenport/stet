import { createConsentStore } from '@policystack/core/consent';
import { expect, type Page } from '@playwright/test';
import policystack, { consentCookie } from '../src/policystack';

// Direct auth POSTs need a captcha token when the Turnstile test keys are
// configured (CI does this); the always-pass secret accepts any value, and
// without keys the header is ignored.
export const captchaTestHeader = { 'x-captcha-response': 'e2e-test-token' };

/**
 * Gives a direct auth POST its own credential-limiter bucket.
 *
 * The limiter keys on cf-connecting-ip, which nothing sets locally, so the
 * account-creating POSTs across the auth specs otherwise share one budget and
 * throttle each other under a parallel run. Pass a distinct address per call
 * site. Set it on the request, never context-wide through extraHTTPHeaders:
 * that reaches the Turnstile widget's cross-origin loads too, and the auth
 * forms then never receive a token.
 */
export function ownRateLimitBucket(address: string) {
  return { 'cf-connecting-ip': address };
}

// Navigate and wait for hydration before interacting. Filling the SSR'd form
// before React hydrates loses the values (hydration resets the controlled
// inputs) and lets the click fall through to a native form submit.
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await settled(page);
}

// React attaches its fiber to every DOM node it owns, so the key appearing on
// document.body is hydration itself rather than a proxy for it. Network idle
// lands 200-250ms earlier, which is enough for a keystroke or a click to hit a
// page whose listeners are not bound yet, and pages carrying the Turnstile
// widget never go idle at all because it holds a request open for its lifetime.
async function settled(page: Page, timeout = 15_000) {
  await page.waitForFunction(
    () => Object.keys(document.body).some((key) => key.startsWith('__reactFiber')),
    { timeout },
  );
}

/**
 * Presses a keyboard shortcut until it takes effect.
 *
 * Hydration commits the tree, but the shortcuts here bind their listeners to
 * `document` from an effect, which React runs afterwards. A single press can
 * land in that window and be swallowed with the page looking entirely ready,
 * so the press is the thing to retry rather than something to wait out first.
 * `expect` still fails the test if the shortcut never works.
 */
export async function pressUntil(
  page: Page,
  shortcut: string,
  landed: () => Promise<unknown>,
): Promise<void> {
  await expect(async () => {
    await page.keyboard.press(shortcut);
    await landed();
  }).toPass({ timeout: 15_000, intervals: [100, 250, 500, 1000] });
}

/** The sidebar footer's user menu, which holds account settings and sign out. */
export function accountMenuButton(page: Page) {
  return page.getByRole('button', { name: 'Account menu' });
}

// Matched exactly: the security settings page also carries "Sign out all other
// sessions", which a substring match would hit whenever the account has a
// second live session.
/** Opens the sidebar footer's user menu, which holds the account pages. */
export async function openAccountMenu(page: Page) {
  await accountMenuButton(page).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

// Escape has to reach the popup itself: sent to the page it lands on the body,
// and the menu's own backdrop then intercepts every later click.
export async function closeAccountMenu(page: Page) {
  await page.getByRole('menu').press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
}

export async function signOut(page: Page) {
  await openAccountMenu(page);
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
}

export async function signIn(page: Page, email: string, password: string) {
  await gotoHydrated(page, '/sign/in');
  await page.getByLabel('Email').fill(email);
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

// Creates a fresh account that owns a fresh organization, for specs that
// must never touch the shared seed organization.
export async function signUpWithOrg(
  page: Page,
  name: string,
  email: string,
  organizationName: string,
) {
  await gotoHydrated(page, '/sign/up');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Create an organization')).toBeVisible();
  await page.getByLabel('Name').fill(organizationName);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

// Pre-seeding an accepted record keeps the banner from overlaying controls in
// specs that are not about consent (consent.spec starts bare instead). Minted
// through the real store and encoder so it tracks policy-version hashes and
// the adapter's cookie format.
function consentCookieValue(): string {
  const store = createConsentStore(policystack);
  store.acceptAll();
  const record = store.getConsentRecord();
  if (record === null) {
    throw new Error('acceptAll() left the consent store undecided');
  }
  return consentCookie.serialize(record);
}

/** storageState for specs that need a fresh user but no consent banner. */
export function freshStorageState() {
  return {
    cookies: [
      {
        name: consentCookie.name,
        value: consentCookieValue(),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };
}
