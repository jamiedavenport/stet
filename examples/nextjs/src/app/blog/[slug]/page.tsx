import Link from 'next/link';

import { stet } from '../../../lib/stet';

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await stet.posts.get(slug);

  return (
    <main>
      <p>
        <Link href="/blog">← Blog</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">Updated {new Date(post.updatedAt).toLocaleDateString('en-GB')}</p>
      {post.fields.cover == null ? null : <img src={post.fields.cover.url} alt="" />}
      {post.fields.body == null ? (
        <p className="muted">This post has no body yet.</p>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: post.fields.body.html }} />
      )}
    </main>
  );
}
