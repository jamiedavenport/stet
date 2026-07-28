import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { Link } from '@tanstack/react-router';

import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { ArrowLink, DisplayHeading, Label, Lede } from './ui.tsrx';

// Text-only sketch of the one-Worker deployment; doubles as the hero visual.
function PlatformDiagram() @{
  const surfaces = [
    m.marketing_surface_web(),
    m.marketing_surface_api(),
    m.marketing_surface_auth(),
    m.marketing_surface_ai(),
    m.marketing_surface_realtime(),
    m.marketing_surface_jobs(),
    m.marketing_surface_crons(),
    m.marketing_surface_workflows(),
  ];
  const bindings = ['D1', 'R2', 'Queues', 'Durable Objects'];
  <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
    <p className="text-xs font-medium text-muted-foreground">
      {brand.slug}-web · {m.marketing_one_worker()}
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      @for (const surface of surfaces; key surface) {
        <Badge variant="secondary">{surface}</Badge>
      }
    </div>
    <p className="mt-6 text-xs font-medium text-muted-foreground">{m.marketing_bound_to()}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      @for (const binding of bindings; key binding) {
        <Badge variant="outline">{binding}</Badge>
      }
    </div>
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
          <Button size="lg" render={<Link to="/" hash="pricing" />}>
            {m.marketing_get_onyx({ brandName: brand.name })}
          </Button>
          <ArrowLink href={brand.docs}>{m.marketing_read_the_docs()}</ArrowLink>
        </div>
      </div>
      <div className="flex items-center justify-center max-lg:hidden">
        <PlatformDiagram />
      </div>
    </div>
  </section>
}
