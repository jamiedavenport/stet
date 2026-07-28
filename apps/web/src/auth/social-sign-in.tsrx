import { authClient } from '@repo/auth/client';
import { Button } from '@repo/ui/components/button';

import type { SocialProvider } from '#/auth/functions';

const labels: Record<SocialProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

function GoogleIcon() @{
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
    />
  </svg>
}

function GithubIcon() @{
  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
  </svg>
}

function ProviderIcon({ provider }: { provider: SocialProvider }) @{
  <>
    @if (provider === 'google') {
      <GoogleIcon />
    } @else {
      <GithubIcon />
    }
  </>
}

// Social sign-in buttons plus an "or" divider. Rendered above the email form
// on both sign-in and sign-up; the provider list comes from the /sign route
// loader, so it is empty (and this renders nothing) when no provider is set.
export function SocialSignIn({
  providers,
  callbackURL,
}: {
  providers: SocialProvider[];
  // App-relative landing page after OAuth; pages pass the ?redirect target.
  callbackURL: string;
}) @{
  const onClick = async (provider: SocialProvider) => {
    await authClient.signIn.social({ provider, callbackURL });
  };

  <>
    @if (providers.length > 0) {
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          @for (const provider of providers; key provider) {
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void onClick(provider)}
            >
              <ProviderIcon provider={provider} />
              {labels[provider]}
            </Button>
          }
        </div>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{"or continue with email"}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
    }
  </>
}
