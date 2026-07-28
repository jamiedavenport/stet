import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';

export type SocialProvider = 'google' | 'github';

export type SignConfig = {
  providers: SocialProvider[];
  // Public Turnstile site key, or null when bot protection is off. The
  // matching secret gates the server-side check (private/auth).
  turnstileSiteKey: string | null;
};

// What the auth pages need from the server: which social buttons to render
// (the client can't see the secrets, so it asks; a provider is enabled only
// when both its id and secret are set) and whether to render the Turnstile
// widget.
export const getSignConfig = createServerFn({ method: 'GET' }).handler((): SignConfig => {
  const providers: SocialProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push('google');
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push('github');
  }
  const siteKey = env.TURNSTILE_SITE_KEY;
  return {
    providers,
    turnstileSiteKey:
      siteKey === undefined || siteKey === '' || !env.TURNSTILE_SECRET_KEY ? null : siteKey,
  };
});

export const socialProvidersQuery = queryOptions({
  queryKey: ['social-providers'],
  queryFn: async () => (await getSignConfig()).providers,
  staleTime: Infinity,
});
