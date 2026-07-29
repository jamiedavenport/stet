import { createFileRoute, Link } from '@tanstack/react-router';
import Markdown from 'react-markdown';

import { fetchLanding } from '../content';

export const Route = createFileRoute('/')({
  loader: () => fetchLanding(),
  component: Home,
});

function Home() {
  const landing = Route.useLoaderData();

  return (
    <main>
      <h1>{landing.fields.headline ?? landing.title}</h1>
      {landing.fields.pitch == null ? null : <Markdown>{landing.fields.pitch}</Markdown>}
      <p>
        <Link to="/blog">Read the blog →</Link>
      </p>
      <p className="muted">
        This page renders the “Landing” map; the blog renders the “Posts” collection. Both are typed
        from the model built in the Stet UI.
      </p>
    </main>
  );
}
