import { brand } from '@repo/brand';
import { getLocale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import { createFileRoute } from '@tanstack/react-router';

import { RailList, RailRow } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { DisplayHeading, Label, TagRow } from '@repo/ui/marketing/ui.tsrx';
import { sortedReleases } from '#/marketing/content';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/changelog')({
  head: () =>
    seo({
      title: `${m.marketing_changelog_eyebrow()} · ${brand.name}`,
      description: m.marketing_changelog_seo_description(),
      path: '/changelog',
    }),
  component: ChangelogPage,
});

// Built per render so dates format in the request's locale.
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(getLocale(), {
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
        eyebrow={m.marketing_changelog_eyebrow()}
        title={m.marketing_changelog_heading()}
        lede={m.marketing_changelog_lede()}
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
