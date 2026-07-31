import { Link, createFileRoute, notFound } from '@tanstack/react-router';

import { brand } from '@repo/brand';
import { DisplayHeading, Label, Lede, PostMeta, TagRow } from '@repo/ui/marketing/ui.tsrx';
import { MarketingCta } from '#/marketing/sections/bands.tsrx';
import { fetchPost } from '#/marketing/content';
import { postDate, postSummary } from '#/marketing/posts';
import { blogPostingJsonLd, seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/blog/$slug')({
  loader: async ({ params }) => {
    const post = await fetchPost({ data: params.slug });
    if (post === undefined) {
      throw notFound();
    }
    return { post };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          ...seo({
            title: `${loaderData.post.title} · ${brand.name}`,
            description: postSummary(loaderData.post),
            path: `/blog/${loaderData.post.slug}`,
            type: 'article',
          }),
          scripts: [blogPostingJsonLd(loaderData.post)],
        }
      : {},
  component: BlogPostPage,
});

function BackToPosts({ className }: { className?: string }) {
  return (
    <Label className={className}>
      <Link to="/blog" className="hover:text-foreground">
        <span aria-hidden="true">←</span> All posts
      </Link>
    </Label>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData();

  return (
    <>
      <article className="mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-8 px-6 py-16 sm:py-20 lg:grid-cols-[16rem_1fr] lg:px-8">
        <div>
          <Label>Blog</Label>
          <BackToPosts className="mt-4" />
        </div>
        <div>
          <DisplayHeading as="h1" className="max-w-[24ch] text-4xl text-pretty sm:text-5xl">
            {post.title}
          </DisplayHeading>
          <PostMeta author={post.fields.author?.name} date={postDate(post)} className="mt-5" />
          <Lede className="mt-6">{postSummary(post)}</Lede>
          <TagRow tags={post.fields.tags ?? []} className="mt-6" />
          <div
            className="prose mt-12 max-w-[65ch]"
            dangerouslySetInnerHTML={{ __html: post.fields.body?.html ?? '' }}
          />
        </div>
      </article>
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <BackToPosts />
        </div>
      </section>
      <MarketingCta />
    </>
  );
}
