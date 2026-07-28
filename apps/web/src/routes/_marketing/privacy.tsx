import { brand } from '@repo/brand';
import { PrivacyPolicy } from '@policystack/react/policy';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { PolicyPageBody, policyLocale } from '#/legal/policy-page';
import policystack from '#/policystack';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/privacy')({
  head: () =>
    seo({
      title: `${'Privacy policy'} · ${brand.name}`,
      description: 'How this product collects, uses, and protects your data.',
      path: '/privacy',
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow={'Legal'} title={'Privacy policy'} />
      <PolicyPageBody>
        <PrivacyPolicy config={policystack} locale={policyLocale()} />
      </PolicyPageBody>
    </>
  );
}
