import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { createFileRoute } from '@tanstack/react-router';

import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { ArrowLink } from '@repo/ui/marketing/ui.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/contact')({
  head: () =>
    seo({
      title: `${m.marketing_contact_eyebrow()} · ${brand.name}`,
      description: m.marketing_contact_seo_description(),
      path: '/contact',
    }),
  component: ContactPage,
});

// Built in render so the copy resolves in the request's locale.
function reasons() {
  return [
    {
      term: m.marketing_contact_reason_questions_term(),
      detail: m.marketing_contact_reason_questions_detail(),
    },
    {
      term: m.marketing_contact_reason_broken_term(),
      detail: m.marketing_contact_reason_broken_detail(),
    },
    {
      term: m.marketing_contact_reason_feedback_term(),
      detail: m.marketing_contact_reason_feedback_detail(),
    },
  ];
}

function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow={m.marketing_contact_eyebrow()}
        title={m.marketing_contact_heading()}
        lede={m.marketing_contact_lede()}
      />
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <a href={`mailto:${brand.email}`} className="hover:underline">
              {brand.email}
            </a>
          </p>
          <TermRows rows={reasons()} className="mt-12" />
          <p className="mt-10 text-sm">
            <ArrowLink href={brand.author.url}>{m.marketing_more_about_jxd()}</ArrowLink>
          </p>
        </div>
      </section>
    </>
  );
}
