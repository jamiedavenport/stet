import type { BetterAuthPlugin } from 'better-auth';
import { captcha } from 'better-auth/plugins';

/**
 * Turnstile on the credential endpoints: the token arrives in the
 * x-captcha-response header and is verified server-side before the handler
 * runs. Without a secret the placeholder keeps the endpoints open (local dev,
 * forks that skip bot protection).
 *
 * Both branches produce the same static type so the plugins array stays a
 * tuple Better Auth can infer from; a conditional spread there would widen the
 * array and break every plugin's inference. The placeholder branch has no
 * hooks and therefore no effect.
 */
export function turnstilePlugin(secretKey: string | undefined): BetterAuthPlugin {
  if (secretKey === undefined || secretKey === '') {
    return { id: 'captcha' };
  }
  return captcha({
    provider: 'cloudflare-turnstile',
    secretKey,
    endpoints: [
      '/sign-up/email',
      '/sign-in/email',
      '/request-password-reset',
      '/sign-in/magic-link',
    ],
  });
}
