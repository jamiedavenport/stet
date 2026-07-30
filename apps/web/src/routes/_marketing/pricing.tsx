import { brand } from '@repo/brand';
import { Link, createFileRoute } from '@tanstack/react-router';

import { Button } from '@repo/ui/components/button';
import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { pricingFaqs } from '#/marketing/data/pricing';
import { Band } from '#/marketing/sections/bands.tsrx';
import { PricingPlans } from '#/marketing/sections/pricing.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/pricing')({
  head: () =>
    seo({
      title: `Pricing · ${brand.name}`,
      description:
        'Ten dollars per user per month on the cloud, free to self-host, and custom for enterprises. Every feature is on every plan.',
      path: '/pricing',
    }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Pricing"
        title="Ten dollars a person. Everything included."
        lede="One price, the whole product. Analytics and AI are not a higher tier, and seats are the only thing that scales."
      />
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <PricingPlans />
        </div>
      </section>
      <Band title="The questions this page gets asked.">
        <TermRows rows={pricingFaqs} />
      </Band>
      <Band
        title="Still weighing it up?"
        lede="The comparison pages put Stet next to whatever you are using now, and say what that product does better."
      >
        <Button size="lg" variant="outline" nativeButton={false} render={<Link to="/compare" />}>
          Compare with your current CMS
        </Button>
      </Band>
    </>
  );
}
