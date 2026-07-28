import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { CookiePolicy } from '@policystack/react/policy';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { PolicyPageBody, policyLocale } from '#/legal/policy-page';
import policystack from '#/policystack';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/cookies')({
  head: () =>
    seo({
      title: `${m.cookie_policy_title()} · ${brand.name}`,
      description: m.cookie_policy_seo_description(),
      path: '/cookies',
    }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <>
      <PageIntro eyebrow={m.legal()} title={m.cookie_policy_title()} />
      <PolicyPageBody>
        <CookiePolicy config={policystack} locale={policyLocale()} />
      </PolicyPageBody>
    </>
  );
}
