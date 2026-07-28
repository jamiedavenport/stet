import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { Link } from '@tanstack/react-router';

import { Button } from '../components/button';
import { ArrowLink, DisplayHeading, Label, Lede } from './ui.tsrx';

// The typed client against the model marketing built; doubles as the hero
// visual. Identifiers stay hardcoded (identical in every locale), only the
// trailing comment is translated.
function ClientCodeCard() @{
  const codeLines = [
    'import { stet } from "@stet/client";',
    '',
    'const posts = await stet.posts.list();',
    'const post = await stet.posts.get("hello-world");',
    'const landing = await stet.landing.get();',
  ];
  <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
    <p className="font-mono text-xs font-medium text-muted-foreground">@stet/client</p>
    <pre className="mt-4 overflow-x-auto font-mono text-xs/6 text-foreground">
      {codeLines.join('\n')}
    </pre>
    <p className="mt-1 font-mono text-xs/6 text-muted-foreground">
      {'// '}
      {m.marketing_code_comment()}
    </p>
  </div>
}

export function HeroSplit() @{
  <section>
    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-8 gap-y-16 px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:grid-cols-[1fr_1fr] lg:px-8">
      <div>
        <Label>{brand.description}</Label>
        <DisplayHeading as="h1" className="mt-6 max-w-[20ch] text-5xl sm:text-7xl">
          {m.marketing_hero_headline()}
        </DisplayHeading>
        <Lede className="mt-6">{m.marketing_hero_lede({ brandName: brand.name })}</Lede>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Button size="lg" render={<Link to="/sign/up" />}>
            {m.marketing_get_started()}
          </Button>
          <ArrowLink href={brand.docs}>{m.marketing_read_the_docs()}</ArrowLink>
        </div>
      </div>
      <div className="flex items-center justify-center max-lg:hidden">
        <ClientCodeCard />
      </div>
    </div>
  </section>
}
