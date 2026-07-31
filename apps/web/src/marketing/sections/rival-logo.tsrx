import { cn } from '@repo/ui/lib/utils';

import { logoUrl } from '#/marketing/data/logos';

/**
 * A competitor's mark. The monogram is drawn first and the fetched logo sits
 * on top of it, so a missing token, a rate limit or a 404 all degrade to the
 * initial rather than to a hole in the layout. An `alt=""` image that fails
 * to load renders nothing, which is what lets the tile behind it show.
 */
export function RivalLogo({
  domain,
  name,
  className,
}: {
  domain: string;
  name: string;
  className?: string;
}) @{
  const src = logoUrl(domain);

  <span
    className={cn(
      'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted font-semibold text-muted-foreground uppercase outline-1 -outline-offset-1 outline-foreground/10',
      className,
    )}
  >
    {name.charAt(0)}
    @if (src !== undefined) {
      <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full bg-white object-contain" />
    }
  </span>
}
