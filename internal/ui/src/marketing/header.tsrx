import { useState } from 'react';
import { brand } from '@repo/brand';
import { CaretDownIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';

import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import { Wordmark } from './ui.tsrx';
import type { MarketingNavLink } from './nav';

/** The two lists the header opens onto, which the app owns rather than us. */
type MenuLists = { features: MarketingNavLink[]; personas: MarketingNavLink[] };

type PageLink = { label: string; to: LinkProps['to'] };

const pageLinks: PageLink[] = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Compare', to: '/compare' },
  { label: 'Blog', to: '/blog' },
];

const navLink = 'text-muted-foreground hover:text-foreground';
const activeLink = { className: 'text-foreground' };

function DocsLink({ className }: { className: string }) @{
  <a href={brand.docs} target="_blank" rel="noreferrer" className={className}>
    {"Docs"}
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

// The features and the personas are the product, so the header opens onto
// them rather than making each index page a toll gate on the way.
function NavMenu({
  label,
  indexLabel,
  indexTo,
  items,
}: {
  label: string;
  indexLabel: string;
  indexTo: LinkProps['to'];
  items: MarketingNavLink[];
}) @{
  <DropdownMenu>
    <DropdownMenuTrigger
      className={`flex items-center gap-1 outline-none data-popup-open:text-foreground ${navLink}`}
    >
      {label}
      <CaretDownIcon className="size-3 shrink-0" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" sideOffset={16} className="w-80">
      @for (const item of items; key item.label) {
        <DropdownMenuItem
          className="flex-col items-start gap-0.5 px-3 py-2.5"
          render={<Link to={item.to} params={item.params} />}
        >
          <p className="font-medium text-foreground">{item.label}</p>
          <p className="text-sm text-pretty text-muted-foreground">{item.description}</p>
        </DropdownMenuItem>
      }
      <DropdownMenuSeparator />
      <DropdownMenuItem className="px-3 py-2" render={<Link to={indexTo} />}>
        {indexLabel}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

function DesktopNav({ features, personas }: MenuLists) @{
  <nav className="hidden items-center gap-6 text-sm lg:flex">
    <NavMenu label="Features" indexLabel="All features" indexTo="/features" items={features} />
    <NavMenu label="Who it is for" indexLabel="Everyone it is for" indexTo="/for" items={personas} />
    @for (const link of pageLinks; key link.to) {
      <Link to={link.to} className={navLink} activeProps={activeLink}>
        {link.label}
      </Link>
    }
    <DocsLink className={navLink} />
  </nav>
}

const mobileLink = 'block py-2 text-muted-foreground hover:text-foreground';

function MobileGroup({
  label,
  to,
  items,
  onNavigate,
}: {
  label: string;
  to: LinkProps['to'];
  items: MarketingNavLink[];
  onNavigate: () => void;
}) @{
  <div>
    <Link to={to} onClick={onNavigate} className={mobileLink}>
      {label}
    </Link>
    <div className="border-l border-border pl-4">
      @for (const item of items; key item.label) {
        <Link to={item.to} params={item.params} onClick={onNavigate} className={mobileLink}>
          {item.label}
        </Link>
      }
    </div>
  </div>
}

function MobileMenu({
  features,
  personas,
  onNavigate,
}: MenuLists & { onNavigate: () => void }) @{
  <nav id="mobile-menu" className="border-t border-border lg:hidden">
    <div className="mx-auto max-w-7xl px-6 py-4 text-base sm:text-sm">
      <MobileGroup label="Features" to="/features" items={features} onNavigate={onNavigate} />
      <MobileGroup label="Who it is for" to="/for" items={personas} onNavigate={onNavigate} />
      @for (const link of pageLinks; key link.to) {
        <Link to={link.to} onClick={onNavigate} className={mobileLink}>
          {link.label}
        </Link>
      }
      <DocsLink className={mobileLink} />
    </div>
  </nav>
}

export function MarketingHeader({ signedIn, features, personas }: MenuLists & { signedIn: boolean }) @{
  const [open, setOpen] = useState(false);
  const cta = signedIn
    ? { label: "Dashboard", to: '/app' as const }
    : { label: "Sign in", to: '/sign/in' as const };

  <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
      <Link to="/" aria-label={"Homepage"}>
        <Wordmark />
      </Link>
      <div className="flex items-center gap-6">
        <DesktopNav features={features} personas={personas} />
        <Button size="sm" nativeButton={false} render={<Link to={cta.to} />}>
          {cta.label}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex items-center text-muted-foreground hover:text-foreground lg:hidden"
        >
          <MenuIcon open={open} />
        </button>
      </div>
    </div>
    @if (open) {
      <MobileMenu features={features} personas={personas} onNavigate={() => setOpen(false)} />
    }
  </header>
}
