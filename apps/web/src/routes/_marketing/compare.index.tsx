import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { researchedOn } from '#/marketing/data/compare';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { RivalCards } from '#/marketing/sections/cards.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/compare/')({
  head: () =>
    seo({
      title: `Compare · ${brand.name}`,
      description:
        'Stet against WordPress, Sanity, Contentful, Payload, Storyblok, Webflow, Strapi, Prismic and Directus, with the same seven questions asked of each.',
      path: '/compare',
    }),
  component: CompareIndexPage,
});

const method = [
  {
    term: 'The same seven questions',
    detail:
      'Every comparison answers who models the content, how types reach your app, what happens when the model changes, and how analytics, AI, hosting and pricing work. No cherry-picking the axes that flatter us.',
  },
  {
    term: 'Their strengths, in their terms',
    detail:
      'Each page says what the other product does better than Stet, because that is the part you actually need in order to decide.',
  },
  {
    term: 'When to pick them instead',
    detail:
      'Every page ends with the case for choosing the other one. Some of these are better answers than Stet for some teams, and saying so costs us nothing.',
  },
  {
    term: 'Checked, and dated',
    detail: `Facts were taken from published documentation and pricing pages in ${researchedOn}. Products move; if something here has gone out of date, tell us and it gets fixed.`,
  },
];

function CompareIndexPage() {
  return (
    <>
      <PageIntro
        eyebrow="Compare"
        title="How Stet differs, without the straw men."
        lede="Most of these products are good. They mostly make one team wait for the other, which is the specific thing Stet is built not to do."
      />
      <Band title="Nine comparisons.">
        <RivalCards />
      </Band>
      <Band
        title="How these pages are written."
        lede="A comparison page written by the vendor is worth reading only if it is honest about the other side."
      >
        <TermRows rows={method} />
      </Band>
      <MarketingCta />
    </>
  );
}
