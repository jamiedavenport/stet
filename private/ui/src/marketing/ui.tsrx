import { brand } from '@repo/brand';
import { BrandMark } from '@repo/brand/mark';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Badge } from '../components/badge';
import { cn } from '../lib/utils';

// Plain marketing primitives on the app's design tokens.

export function Wordmark() @{
  <span className="flex items-center gap-2.5 text-lg font-semibold">
    <BrandMark className="w-6 shrink-0" />
    {brand.name}
  </span>
}

export function Label({
  as: Tag = 'p',
  className,
  children,
}: {
  as?: 'p' | 'h2' | 'h3' | 'div';
  className?: string;
  children: ReactNode;
}) @{
  <Tag className={cn('text-sm font-medium text-muted-foreground', className)}>{children}</Tag>
}

export function DisplayHeading({
  as: Tag = 'h3',
  className,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  children: ReactNode;
}) @{
  <Tag className={cn('font-semibold tracking-tight text-balance', className)}>{children}</Tag>
}

export function Lede({ className, children }: { className?: string; children: ReactNode }) @{
  <p className={cn('max-w-[48ch] text-lg/8 text-pretty text-muted-foreground', className)}>
    {children}
  </p>
}

export function BodyText({ className, children }: { className?: string; children: ReactNode }) @{
  <p className={cn('max-w-[56ch] text-base/7 text-pretty text-muted-foreground', className)}>
    {children}
  </p>
}

function externalLinkProps(href: string | undefined) {
  if (href?.startsWith('http')) {
    return { target: '_blank', rel: 'noreferrer' } as const;
  }
  return undefined;
}

type LinkTarget = {
  to?: LinkProps['to'];
  params?: LinkProps['params'];
  hash?: string;
  href?: string;
  className?: string;
  children: ReactNode;
};

/** Renders a router `Link` when given `to`, a plain anchor when given `href`. */
export function MarketingLink({ to, params, hash, href, className, children }: LinkTarget) @{
  <>
    {to ? (
      <Link to={to} params={params} hash={hash} className={className}>
        {children}
      </Link>
    ) : (
      <a href={href} className={className} {...externalLinkProps(href)}>
        {children}
      </a>
    )}
  </>
}

export function PostMeta({
  author,
  readingTime,
  className,
}: {
  author?: string;
  readingTime: number;
  className?: string;
}) @{
  <p className={cn('text-sm text-muted-foreground', className)}>
    {author ? `${author} · ` : ''}
    {`${readingTime} min read`}
  </p>
}

export function TagRow({ tags, className }: { tags: string[]; className?: string }) @{
  @if (tags.length > 0) {
    <ul role="list" className={cn('flex flex-wrap gap-1.5', className)}>
      @for (const tag of tags; key tag) {
        <li>
          <Badge variant="outline">{tag}</Badge>
        </li>
      }
    </ul>
  }
}
