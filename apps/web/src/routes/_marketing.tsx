import { authClient } from '@repo/auth/client';
import { setLocale, type Locale } from '@repo/i18n';
import { Outlet, createFileRoute, getRouteApi } from '@tanstack/react-router';

import { MarketingFooter } from '@repo/ui/marketing/footer.tsrx';
import { MarketingHeader } from '@repo/ui/marketing/header.tsrx';

const rootRoute = getRouteApi('__root__');

// Reads the session root resolved, to switch the nav CTA (Dashboard vs See Demo).
export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout,
});

function MarketingLayout() {
  const { session } = rootRoute.useRouteContext();
  const signedIn = session !== null;

  // Anonymous visitors only need the cookie, which setLocale writes before it
  // reloads. A signed-in visitor also needs the account updated, or the stored
  // preference would be re-pinned over this choice on the next request.
  const onLocaleChange = async (locale: Locale) => {
    if (signedIn) {
      await authClient.updateUser({ locale });
    }
    void setLocale(locale);
  };

  return (
    <div className="isolate flex min-h-dvh flex-col bg-background text-foreground antialiased">
      <MarketingHeader signedIn={signedIn} />
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Explicit param type: TSRX exports do not contextually type callbacks. */}
      <MarketingFooter onLocaleChange={(locale: Locale) => void onLocaleChange(locale)} />
    </div>
  );
}
