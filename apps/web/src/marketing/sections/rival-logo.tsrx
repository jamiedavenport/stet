import { cn } from '@repo/ui/lib/utils';

import { logoUrl } from '#/marketing/data/logos';

/**
 * A competitor's mark, shown beside their name. Renders nothing at all when
 * no logo.dev token is configured, because a broken image is worse than an
 * unillustrated comparison.
 */
export function RivalLogo({ domain, className }: { domain: string; className?: string }) @{
  const src = logoUrl(domain);

  <>
    @if (src !== undefined) {
      <img
        src={src}
        alt=""
        loading="lazy"
        width={32}
        height={32}
        className={cn(
          'size-8 shrink-0 rounded-md bg-white object-contain outline-1 -outline-offset-1 outline-black/10',
          className,
        )}
      />
    }
  </>
}
