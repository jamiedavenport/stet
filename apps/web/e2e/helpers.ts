import { createConsentStore } from '@policystack/core/consent';
import { expect, type Page } from '@playwright/test';
import policystack, { consentCookie } from '../src/policystack';

// Direct auth POSTs need a captcha token when the Turnstile test keys are
// configured (CI does this); the always-pass secret accepts any value, and
// without keys the header is ignored.
export const captchaTestHeader = { 'x-captcha-response': 'e2e-test-token' };

// Navigate and wait for hydration before interacting. Filling the SSR'd form
// before React hydrates loses the values (hydration resets the controlled
// inputs) and lets the click fall through to a native form submit.
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await settled(page);
}

// Network idle is the usual hydration proxy, but the Turnstile widget (when
// configured) holds a request open for its lifetime, so pages carrying it
// never go idle. Its hidden token input is the equivalent signal there: the
// widget mounts from an effect, so the input only appears once React has
// hydrated, and it exists nowhere else. Bounded so neither branch can hang.
async function settled(page: Page, timeout = 10_000) {
  const idle = page.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
  const widget = page
    .locator('input[name="cf-turnstile-response"]')
    .first()
    .waitFor({ state: 'attached', timeout })
    .catch(() => undefined);
  await Promise.race([idle, widget]);
}

// The sidebar control, matched exactly: the security settings page also
// carries "Sign out all other sessions", which a substring match would hit
// whenever the account has a second live session.
export function signOutButton(page: Page) {
  return page.getByRole('button', { name: 'Sign out', exact: true });
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
