import { brand } from '@repo/brand';
import { Button } from '@repo/ui/components/button';
import { CheckIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

import { plans } from '#/marketing/data/pricing';
import type { Plan } from '#/marketing/data/pricing';

// Emphasis is carried by the button and the word "Recommended", never by a
// different card colour, so the three read as one set.

function PlanAction({ plan }: { plan: Plan }) @{
  <>
    @if (plan.id === 'cloud') {
      <Button size="lg" nativeButton={false} className="w-full" render={<Link to="/sign/up" />}>
        {plan.cta}
      </Button>
    }
    @if (plan.id === 'self-hosted') {
      <Button
        size="lg"
        nativeButton={false}
        variant="outline"
        className="w-full"
        render={<a href={brand.docs} target="_blank" rel="noreferrer" />}
      >
        {plan.cta}
      </Button>
    }
    @if (plan.id === 'enterprise') {
      <Button
        size="lg"
        nativeButton={false}
        variant="outline"
        className="w-full"
        render={<a href={brand.demo} target="_blank" rel="noreferrer" />}
      >
        {plan.cta}
      </Button>
    }
  </>
}

function PlanCard({ plan }: { plan: Plan }) @{
  <div className="flex flex-col justify-between rounded-xl p-8 ring-1 ring-foreground/10">
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">{plan.name}</h2>
        @if (plan.emphasised) {
          <p className="text-sm text-muted-foreground">Recommended</p>
        }
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-tight tabular-nums">{plan.price}</p>
      <p className="mt-1 text-sm text-muted-foreground">{plan.unit}</p>
      <p className="mt-6 text-base/7 text-pretty text-muted-foreground">{plan.description}</p>
      <ul role="list" className="mt-8 flex flex-col gap-3">
        @for (const line of plan.includes; key line) {
          <li className="flex items-baseline gap-3 text-base/7">
            <CheckIcon className="size-4 h-lh shrink-0 text-muted-foreground" />
            <span>{line}</span>
          </li>
        }
      </ul>
    </div>
    <div className="mt-10">
      <PlanAction plan={plan} />
    </div>
  </div>
}

/** The three ways to run Stet, side by side. */
export function PricingPlans() @{
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
    @for (const plan of plans; key plan.id) {
      <PlanCard plan={plan} />
    }
  </div>
}
