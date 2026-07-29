import { createFileRoute, Link } from '@tanstack/react-router';

import { fetchPosts } from '../content';

export const Route = createFileRoute('/blog/')({
  loader: () => fetchPosts(),
  component: Blog,
});

function Blog() {
  const posts = Route.useLoaderData();

  return (
    <main>
      <h1>Blog</h1>
      {posts.length === 0 ? <p className="muted">No posts yet. Write one in Stet.</p> : null}
      {posts.map((post) => (
        <article key={post.id}>
          <h2>
            <Link to="/blog/$slug" params={{ slug: post.slug }}>
              {post.title}
            </Link>
          </h2>
          {post.fields.summary == null ? null : <p>{post.fields.summary}</p>}
        </article>
      ))}
    </main>
  );
}
