import { m } from '@repo/i18n/messages';
import { Link } from '@tanstack/react-router';

import { LabeledSection } from './section.tsrx';
import { TermRows } from './lists.tsrx';
import { ArrowLink, PostMeta } from './ui.tsrx';
import { faqs } from './data';

export function Faq() @{
  <LabeledSection title={m.marketing_section_questions()}>
    <TermRows rows={faqs()} />
  </LabeledSection>
}

/** Post fields the teaser renders, passed as props so the package stays free
 * of generated collection imports. */
export type PostSummary = {
  slug: string;
  title: string;
  summary: string;
  readingTime: number;
};

export function BlogTeaser({ posts }: { posts: PostSummary[] }) @{
  <LabeledSection title={m.marketing_section_writing()}>
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
      @for (const post of posts; key post.slug) {
        <article>
          <h3 className="text-sm/6 font-medium">
            <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <p className="mt-2 max-w-[48ch] text-sm/6 text-pretty text-muted-foreground">
            {post.summary}
          </p>
          <PostMeta readingTime={post.readingTime} className="mt-4" />
        </article>
      }
    </div>
    <p className="mt-10 text-sm">
      <ArrowLink to="/blog">{m.marketing_all_posts()}</ArrowLink>
    </p>
  </LabeledSection>
}
