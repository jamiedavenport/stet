import Link from 'next/link';

import { listPosts } from '@/lib/content';

export default async function Blog() {
  const posts = await listPosts();

  return (
    <main>
      <h1>Blog</h1>
      {posts.length === 0 ? <p className="muted">No posts yet. Write one in Stet.</p> : null}
      {posts.map((post) => (
        <article key={post.id}>
          <h2>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h2>
          {post.fields.summary == null ? null : <p>{post.fields.summary}</p>}
        </article>
      ))}
    </main>
  );
}
