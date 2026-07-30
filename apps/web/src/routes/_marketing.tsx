import { Outlet, createFileRoute, getRouteApi } from '@tanstack/react-router';

import { MarketingFooter } from '@repo/ui/marketing/footer.tsrx';
import { MarketingHeader } from '@repo/ui/marketing/header.tsrx';

import { comparisonNav, featureNav, personaNav } from '#/marketing/data/nav';

const rootRoute = getRouteApi('__root__');

// Reads the session root resolved, to switch the nav CTA (Dashboard vs Sign in).
export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout,
});

function MarketingLayout() {
  const { session } = rootRoute.useRouteContext();

  return (
    <div className="isolate flex min-h-dvh flex-col bg-background text-foreground antialiased">
      <MarketingHeader signedIn={session !== null} features={featureNav} personas={personaNav} />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter comparisons={comparisonNav} />
    </div>
  );
}
