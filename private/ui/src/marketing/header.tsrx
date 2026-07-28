import { useState } from 'react';
import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';

import { Button } from '../components/button';
import { Wordmark } from './ui.tsrx';

type PageLink = { label: () => string; to: LinkProps['to']; hash?: string };

// Message functions, not calls: the array is module scope, so calling here
// would freeze the locale at import time. Each render invokes item.label().
const pageLinks: PageLink[] = [
  { label: m.marketing_nav_pricing, to: '/', hash: 'pricing' },
  { label: m.marketing_nav_blog, to: '/blog' },
  { label: m.marketing_nav_changelog, to: '/changelog' },
  { label: m.marketing_nav_contact, to: '/contact' },
];

const navLink = 'text-muted-foreground hover:text-foreground';
const activeLink = { className: 'text-foreground' };

// A hash link's `to` stays active across the whole landing page, so active
// styling would never switch off.
function activeProps(link: PageLink) {
  return link.hash ? undefined : activeLink;
}

function DocsLink({ className }: { className: string }) @{
  <a href={brand.docs} target="_blank" rel="noreferrer" className={className}>
    {m.marketing_nav_docs()}
  </a>
}

function MenuIcon({ open }: { open: boolean }) @{
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} className="size-6 stroke-current" aria-hidden="true">
    @if (open) {
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    }
    @if (!open) {
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    }
  </svg>
}

function DesktopNav() @{
  <nav className="hidden items-center gap-6 text-sm lg:flex">
    @for (const link of pageLinks; key link.to) {
      <Link to={link.to} hash={link.hash} className={navLink} activeProps={activeProps(link)}>
        {link.label()}
      </Link>
    }
    <DocsLink className={navLink} />
  </nav>
}

const mobileLink = 'block py-2 text-muted-foreground hover:text-foreground';

function MobileMenu({ onNavigate }: { onNavigate: () => void }) @{
  <nav id="mobile-menu" className="border-t border-border lg:hidden">
    <div className="mx-auto max-w-7xl px-6 py-4 text-sm">
      @for (const link of pageLinks; key link.to) {
        <Link to={link.to} hash={link.hash} onClick={onNavigate} className={mobileLink}>
          {link.label()}
        </Link>
      }
      <DocsLink className={mobileLink} />
    </div>
  </nav>
}

export function MarketingHeader({ signedIn }: { signedIn: boolean }) @{
  const [open, setOpen] = useState(false);
  const cta = signedIn
    ? { label: m.marketing_dashboard(), to: '/app' as const }
    : { label: m.marketing_see_demo(), to: '/sign/in' as const };

  <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
      <Link to="/" aria-label={m.marketing_homepage()}>
        <Wordmark />
      </Link>
      <div className="flex items-center gap-6">
        <DesktopNav />
        <Button size="sm" render={<Link to={cta.to} />}>
          {cta.label}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? m.marketing_close_menu() : m.marketing_open_menu()}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex items-center text-muted-foreground hover:text-foreground lg:hidden"
        >
          <MenuIcon open={open} />
        </button>
      </div>
    </div>
    @if (open) {
      <MobileMenu onNavigate={() => setOpen(false)} />
    }
  </header>
}
