import { brand } from '@repo/brand';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';

// One filled button per page. A page marks its main action row `primary` and
// every later row `secondary`, which keeps the outline button from competing
// with the hero. The second action is a ghost button in both, so the pair
// always reads as two buttons rather than a button and a stray link.

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
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="lg"
        nativeButton={false}
        variant={emphasis === 'primary' ? 'default' : 'outline'}
        render={<Link to="/sign/up" />}
      >
        Get started
      </Button>
      <Button
        size="lg"
        nativeButton={false}
        variant="ghost"
        render={<a href={brand.demo} target="_blank" rel="noreferrer" />}
      >
        Book a demo
      </Button>
    </div>
  </div>
}
