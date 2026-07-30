import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { Button } from '@repo/ui/components/button';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/contact')({
  head: () =>
    seo({
      title: `${'Contact'} · ${brand.name}`,
      description: 'Questions, bugs, and ideas: one email reaches the engineer.',
      path: '/contact',
    }),
  component: ContactPage,
});

// Built in render so the copy resolves in the request's locale.
function reasons() {
  return [
    {
      term: 'Questions',
      detail:
        'Whether it fits your stack, how a feature works, or what is coming next. Ask anything.',
    },
    {
      term: 'Something broken?',
      detail: 'Include what you expected and what happened instead. Fixes land fast.',
    },
    {
      term: 'Feedback',
      detail: 'The experience is the product. If something feels ordinary, that is worth an email.',
    },
  ];
}

function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow={'Contact'}
        title={'One email reaches the engineer.'}
        lede={'No forms, no queues. Questions, bugs, and ideas all land in the same place.'}
      />
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <a href={`mailto:${brand.email}`} className="hover:underline">
              {brand.email}
            </a>
          </p>
          <TermRows rows={reasons()} className="mt-12" />
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            className="mt-10"
            render={<a href={brand.author.url} target="_blank" rel="noreferrer" />}
          >
            {'More about JXD'}
          </Button>
        </div>
      </section>
    </>
  );
}
