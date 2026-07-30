import { brand } from '@repo/brand';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { researchedOn } from '#/marketing/data/compare';
import { findRival, rivals } from '#/marketing/data/rivals';
import { featureShowcases } from '#/marketing/mockups';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { CompareTable } from '#/marketing/sections/compare-table.tsrx';
import { Showcase } from '#/marketing/sections/showcase.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/compare/$rival')({
  loader: ({ params }) => {
    const rival = findRival(params.rival);
    if (rival === undefined) {
      throw notFound();
    }
    return { rival };
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo({
          title: `${brand.name} vs ${loaderData.rival.name}`,
          description: loaderData.rival.summary.slice(0, 300),
          path: `/compare/${loaderData.rival.slug}`,
        })
      : {},
  component: ComparePage,
});

const lead = featureShowcases['code-generation'][0];

function ComparePage() {
  const { rival } = Route.useLoaderData();
  const others = rivals.filter((other) => other.slug !== rival.slug);

  return (
    <>
      <PageIntro eyebrow="Compare" title={`${brand.name} vs ${rival.name}`} lede={rival.summary} />
      <Band
        title="Side by side."
        lede={`The same seven questions, asked of both. Checked against published documentation in ${researchedOn}.`}
      >
        <CompareTable rival={rival} />
      </Band>
      <Band title={`What ${rival.name} does better.`} lede={rival.strength} />
      {lead === undefined ? null : <Showcase showcase={lead} />}
      <Band title={`When to pick ${rival.name} instead.`} lede={rival.pickThem} />
      <Band
        title="Other comparisons."
        lede="The same seven questions, asked of everything else teams weigh Stet against."
      >
        <ul role="list" className="flex flex-wrap gap-x-6 gap-y-3 text-base">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                to="/compare/$rival"
                params={{ rival: other.slug }}
                className="font-medium hover:underline"
              >
                {`Stet vs ${other.name}`}
              </Link>
            </li>
          ))}
        </ul>
      </Band>
      <MarketingCta />
    </>
  );
}
