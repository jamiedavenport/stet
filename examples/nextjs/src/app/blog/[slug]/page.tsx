import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPost, listPosts } from '@/lib/content';

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await listPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (post === undefined) {
    notFound();
  }

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
