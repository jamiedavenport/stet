import { brand } from '@repo/brand';
import { Button } from '@repo/ui/components/button';
import { ArrowLink } from '@repo/ui/marketing/ui.tsrx';
import { Link } from '@tanstack/react-router';

// One filled button per page. A page marks its main action row `primary` and
// every later row `secondary`, which keeps the outline button from competing
// with the hero. The link-style second action is the same in both.

type ActionsProps = {
  emphasis?: 'primary' | 'secondary';
  className?: string;
};

/**
 * The site's two calls to action, in the order they are always offered:
 * start for free, or talk to someone first.
 */
export function MarketingActions({ emphasis = 'primary', className }: ActionsProps) @{
  <div className={className}>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <Button
        size="lg"
        nativeButton={false}
        variant={emphasis === 'primary' ? 'default' : 'outline'}
        render={<Link to="/sign/up" />}
      >
        Get started
      </Button>
      <ArrowLink href={brand.demo}>Book a demo</ArrowLink>
    </div>
  </div>
}
