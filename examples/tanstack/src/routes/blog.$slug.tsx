import { createFileRoute, Link } from '@tanstack/react-router';
import Markdown from 'react-markdown';

import { fetchPost } from '../content';

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => fetchPost({ data: params.slug }),
  component: Post,
});

function Post() {
  const post = Route.useLoaderData();

  return (
    <main>
      <p>
        <Link to="/blog">← Blog</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">Updated {new Date(post.updatedAt).toLocaleDateString('en-GB')}</p>
      {post.fields.body == null ? (
        <p className="muted">This post has no body yet.</p>
      ) : (
        <Markdown>{post.fields.body}</Markdown>
      )}
    </main>
  );
}
