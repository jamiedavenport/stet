import { readFileSync } from 'node:fs';

import { brand } from '@repo/brand';
import { BrandMark } from '@repo/brand/mark';
import { defineOgTemplate } from '@jxdltd/tanstack/og';
import type { OgTemplateFont } from '@jxdltd/tanstack/og';

const geistMonoMedium = readFileSync(new URL('./fonts/GeistMono-Medium.ttf', import.meta.url));

const INK = '#0a0a0a';
const MUTE = '#737373';

// One Geist Mono weight (500) for the whole card; a second is another ~150 kB
// module for no visible gain. Everything pins 500 so satori won't fall back.
const fonts: OgTemplateFont[] = [
  { name: 'Geist Mono', data: geistMonoMedium, weight: 500, style: 'normal' },
];

const mono = {
  display: 'flex',
  fontFamily: 'Geist Mono',
  fontWeight: 500,
  textTransform: 'uppercase',
} as const;

// Conservative: satori's text measurement is approximate, so a size that
// looks like it fits two lines can wrap to three. Keeps long titles at two.
function titleSize(title: string): number {
  if (title.length > 60) {
    return 56;
  }
  if (title.length > 40) {
    return 68;
  }
  return 84;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function byline(author: string | undefined, date: string | undefined): string {
  const parts = [author, date ? dateFormat.format(new Date(date)) : undefined];
  return parts.filter(Boolean).join(' · ');
}

// route.path is the unresolved config pattern (`/blog/$slug`), not the real
// request path; derive it from the URL instead.
function requestPath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  return pathname.replace(/^\/og/, '').replace(/\.png$/, '') || '/';
}

function Footer({ request }: { request: Request }) {
  const path = requestPath(request);
  return (
    <div
      style={{
        ...mono,
        marginTop: 40,
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderTop: `1px solid rgb(10 10 10 / 0.1)`,
        paddingTop: 28,
        fontSize: 24,
        letterSpacing: 1,
        color: MUTE,
      }}
    >
      <span>{new URL(brand.url).host}</span>
      <span>{path === '/index' ? `by ${brand.author.name}` : path}</span>
    </div>
  );
}

export default defineOgTemplate({
  width: 1200,
  height: 630,
  fonts,
  render: ({ data, request }) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px 72px',
        background: '#fff',
        color: INK,
        fontFamily: 'Geist Mono',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <BrandMark size={52} color={INK} />
        <span style={{ fontSize: 34, fontWeight: 500 }}>{brand.name}</span>
      </div>
      {/* Bottom-anchored, not centered, so a taller wrapped title grows into
          the space above it rather than colliding with the footer. */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ ...mono, fontSize: 26, letterSpacing: 2, color: MUTE }}>{data.tag ?? ''}</p>
        <h1
          style={{
            display: 'flex',
            fontSize: titleSize(data.title),
            fontWeight: 500,
            letterSpacing: -1,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {data.title}
        </h1>
        {data.type === 'article' ? (
          <p style={{ ...mono, fontSize: 22, letterSpacing: 1, color: MUTE }}>
            {byline(data.author, data.date)}
          </p>
        ) : null}
      </div>
      <Footer request={request} />
    </div>
  ),
});
