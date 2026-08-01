import Link from 'next/link';

import { getLanding } from '@/lib/content';

export default async function Home() {
  const landing = await getLanding();

  if (landing === undefined) {
    return <main>Set STET_API_KEY to prerender this page.</main>;
  }

  return (
    <main>
      <h1>{landing.fields.headline ?? landing.title}</h1>
      {landing.fields.pitch == null ? null : (
        <div dangerouslySetInnerHTML={{ __html: landing.fields.pitch.html }} />
      )}
      <p>
        <Link href="/blog">Read the blog →</Link>
      </p>
      <p className="muted">
        This page renders the “Landing” map; the blog renders the “Posts” collection. Both are typed
        from the model built in the Stet UI.
      </p>
    </main>
  );
}
