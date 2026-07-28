import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { Link, createFileRoute } from '@tanstack/react-router';

import { RailList, RailRow } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { DisplayHeading, PostMeta, TagRow } from '@repo/ui/marketing/ui.tsrx';
import { sortedPosts } from '#/marketing/content';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/blog/')({
  head: () =>
    seo({
      title: `${m.marketing_blog_eyebrow()} · ${brand.name}`,
      description: m.marketing_blog_seo_description(),
      path: '/blog',
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const posts = sortedPosts();

  return (
    <>
      <PageIntro
        eyebrow={m.marketing_blog_eyebrow()}
        title={m.marketing_blog_heading()}
        lede={m.marketing_blog_lede()}
      />
      <RailList>
        {posts.map((post) => (
          <RailRow
            key={post.slug}
            rail={<PostMeta author={post.author} readingTime={post.readingTime} />}
          >
            <DisplayHeading as="h2" className="max-w-[40ch] text-2xl text-pretty">
              <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:underline">
                {post.title}
              </Link>
            </DisplayHeading>
            <p className="mt-3 max-w-[56ch] text-sm/6 text-pretty text-muted-foreground">
              {post.summary}
            </p>
            <TagRow tags={post.tags} className="mt-4" />
          </RailRow>
        ))}
      </RailList>
    </>
  );
}
