import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { PrivacyPolicy } from '@policystack/react/policy';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { PolicyPageBody, policyLocale } from '#/legal/policy-page';
import policystack from '#/policystack';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/privacy')({
  head: () =>
    seo({
      title: `${m.privacy_policy()} · ${brand.name}`,
      description: m.privacy_policy_seo_description(),
      path: '/privacy',
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow={m.legal()} title={m.privacy_policy()} />
      <PolicyPageBody>
        <PrivacyPolicy config={policystack} locale={policyLocale()} />
      </PolicyPageBody>
    </>
  );
}
