import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { RailList, RailRow } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { DisplayHeading, Label, TagRow } from '@repo/ui/marketing/ui.tsrx';
import { sortedReleases } from '#/marketing/content';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/changelog')({
  head: () =>
    seo({
      title: `${'Changelog'} · ${brand.name}`,
      description: 'Every release: what shipped and when.',
      path: '/changelog',
    }),
  component: ChangelogPage,
});

// Built per render so dates format in the request's locale.
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function ChangelogPage() {
  const releases = sortedReleases();

  return (
    <>
      <PageIntro
        eyebrow={'Changelog'}
        title={'What shipped, when.'}
        lede={'Every release: what shipped and when.'}
      />
      <RailList>
        {releases.map((release) => (
          <RailRow
            key={release._meta.path}
            rail={
              <div>
                <Label>{formatDate(new Date(release.date))}</Label>
                <TagRow tags={release.tags} className="mt-3" />
              </div>
            }
          >
            <DisplayHeading as="h2" className="max-w-[40ch] text-2xl text-pretty">
              {release.title}
            </DisplayHeading>
            <div
              className="prose mt-4 max-w-[65ch]"
              dangerouslySetInnerHTML={{ __html: release.html }}
            />
          </RailRow>
        ))}
      </RailList>
    </>
  );
}
