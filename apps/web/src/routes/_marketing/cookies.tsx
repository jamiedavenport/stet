import { brand } from '@repo/brand';
import { CookiePolicy } from '@policystack/react/policy';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { PolicyPageBody, policyLocale } from '#/legal/policy-page';
import policystack from '#/policystack';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/cookies')({
  head: () =>
    seo({
      title: `${'Cookie policy'} · ${brand.name}`,
      description: 'The cookies this product sets and the choices you have.',
      path: '/cookies',
    }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <>
      <PageIntro eyebrow={'Legal'} title={'Cookie policy'} />
      <PolicyPageBody>
        <CookiePolicy config={policystack} locale={policyLocale()} />
      </PolicyPageBody>
    </>
  );
}
