import { useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';

import { analytics } from '../analytics';
import { fetchPost } from '../content';

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => fetchPost({ data: params.slug }),
  component: Post,
});

function Post() {
  const post = Route.useLoaderData();

  // The pageview is automatic; this is the custom event on top of it. `slug`
  // is checked against the plan, so renaming the prop fails the build here
  // rather than quietly producing a column of nulls in the dashboard.
  useEffect(() => {
    analytics.track('post.read', { slug: post.slug });
  }, [post.slug]);

  return (
    <main>
      <p>
        <Link to="/blog">← Blog</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">Updated {new Date(post.updatedAt).toLocaleDateString('en-GB')}</p>
      {post.fields.cover && <img src={post.fields.cover.url} alt="" />}
      {post.fields.body == null ? (
        <p className="muted">This post has no body yet.</p>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: post.fields.body.html }} />
      )}
    </main>
  );
}
