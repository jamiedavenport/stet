import { brand } from '@repo/brand';
import { Link, createFileRoute } from '@tanstack/react-router';

import { RailList, RailRow } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { DisplayHeading, PostMeta, TagRow } from '@repo/ui/marketing/ui.tsrx';
import { fetchPosts } from '#/marketing/content';
import { postDate, postSummary } from '#/marketing/posts';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/blog/')({
  loader: () => fetchPosts(),
  head: () =>
    seo({
      title: `${'Blog'} · ${brand.name}`,
      description: 'Notes from the build: design decisions and engineering write-ups.',
      path: '/blog',
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const posts = Route.useLoaderData();

  return (
    <>
      <PageIntro
        eyebrow={'Blog'}
        title={'Notes from the build.'}
        lede={'Design notes and engineering decisions from the build.'}
      />
      <RailList>
        {posts.map((post) => (
          <RailRow
            key={post.slug}
            rail={<PostMeta author={post.fields.author?.name} date={postDate(post)} />}
          >
            <DisplayHeading as="h2" className="max-w-[40ch] text-2xl text-pretty">
              <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:underline">
                {post.title}
              </Link>
            </DisplayHeading>
            <p className="mt-3 max-w-[56ch] text-sm/6 text-pretty text-muted-foreground">
              {postSummary(post)}
            </p>
            <TagRow tags={post.fields.tags ?? []} className="mt-4" />
          </RailRow>
        ))}
      </RailList>
    </>
  );
}
