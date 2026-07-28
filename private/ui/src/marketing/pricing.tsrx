import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../components/button';
import { LabeledSection } from './section.tsrx';
import { Label } from './ui.tsrx';

// Provisional prices; kept here so a fork only edits one file. Built in
// render so the copy resolves in the request's locale.
function license() {
  return {
    price: '£399',
    priceNote: m.marketing_license_price_note(),
    description: m.marketing_license_description(),
    bullets: [
      m.marketing_license_bullet_repository(),
      m.marketing_license_bullet_tests(),
      m.marketing_license_bullet_updates(),
    ],
  };
}

function engagement() {
  return {
    price: m.marketing_engagement_price(),
    priceNote: m.marketing_engagement_price_note(),
    description: m.marketing_engagement_description(),
    bullets: [
      m.marketing_engagement_bullet_weeks(),
      m.marketing_engagement_bullet_senior(),
      m.marketing_engagement_bullet_handover(),
    ],
  };
}

function Bullets({ items }: { items: string[] }) @{
  <ul role="list" className="mt-6 space-y-2.5 text-sm/6 text-muted-foreground">
    @for (const item of items; key item) {
      <li className="flex gap-x-2.5">
        <CheckIcon aria-hidden className="h-lh size-4 shrink-0 text-foreground" strokeWidth={2} />
        {item}
      </li>
    }
  </ul>
}

function PriceCard({
  label,
  price,
  priceNote,
  description,
  bullets,
  cta,
}: {
  label: string;
  price: string;
  priceNote: string;
  description: string;
  bullets: string[];
  cta: ReactNode;
}) @{
  <div className="flex flex-col justify-between rounded-xl bg-card p-8 text-card-foreground ring-1 ring-foreground/10">
    <div>
      <Label as="h3">{label}</Label>
      <p className="mt-5 flex items-baseline gap-x-2">
        <span className="text-4xl font-semibold tracking-tight">{price}</span>
        <span className="text-xs font-medium text-muted-foreground">{priceNote}</span>
      </p>
      <p className="mt-3 text-sm/6 text-pretty text-muted-foreground">{description}</p>
      <Bullets items={bullets} />
    </div>
    <div className="mt-8">{cta}</div>
  </div>
}

export function PricingCards() @{
  <LabeledSection id="pricing" title={m.marketing_section_pricing()}>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <PriceCard
        label={m.marketing_license_label()}
        {...license()}
        cta={
          <Button
            variant="outline"
            render={<a href={`mailto:${brand.email}?subject=Onyx license`} />}
          >
            {m.marketing_get_onyx({ brandName: brand.name })}
          </Button>
        }
      />
      <PriceCard
        label={m.marketing_engagement_label()}
        {...engagement()}
        cta={
          <Button variant="outline" render={<a href={brand.author.url} target="_blank" rel="noreferrer" />}>
            {m.marketing_engagement_cta()}
          </Button>
        }
      />
    </div>
    <p className="mt-6 text-xs font-medium text-muted-foreground">
      {m.marketing_pricing_provisional()}
    </p>
  </LabeledSection>
}
