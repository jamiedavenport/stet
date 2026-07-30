import { brand } from '@repo/brand';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { MarketingLink, Wordmark } from './ui.tsrx';

const footerLink = 'text-muted-foreground hover:text-foreground';

type FooterLink = {
  label: string;
  to?: LinkProps['to'];
  params?: LinkProps['params'];
  href?: string;
  hash?: string;
};

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Compare', to: '/compare' },
      { label: 'Book a demo', href: brand.demo },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    title: 'Who it is for',
    links: [
      { label: 'Marketing teams', to: '/for/$persona', params: { persona: 'marketing' } },
      { label: 'Engineers', to: '/for/$persona', params: { persona: 'engineering' } },
      { label: 'Agencies', to: '/for/$persona', params: { persona: 'agencies' } },
      { label: 'Startups', to: '/for/$persona', params: { persona: 'startups' } },
      { label: 'Enterprise', to: '/for/$persona', params: { persona: 'enterprise' } },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Docs', href: brand.docs },
      { label: 'GitHub', href: brand.repository },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact', to: '/contact' },
      { label: brand.author.name, href: brand.author.url },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Cookie policy', to: '/cookies' },
    ],
  },
];

function FooterColumn({ title, children }: { title: string; children: ReactNode }) @{
  <div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <ul role="list" className="mt-4 space-y-3 text-sm">
      {children}
    </ul>
  </div>
}

export function MarketingFooter() @{
  <footer className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[36ch] text-sm text-muted-foreground">
            {`${brand.description}. Marketing owns the model, engineering gets a typed contract, and nothing breaks between them.`}
          </p>
          <p className="mt-6 text-sm">
            <a href={`mailto:${brand.email}`} className="font-medium hover:underline">
              {brand.email}
            </a>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          @for (const column of columns; key column.title) {
            <FooterColumn title={column.title}>
              @for (const link of column.links; key link.label) {
                <li>
                  <MarketingLink
                    to={link.to}
                    params={link.params}
                    hash={link.hash}
                    href={link.href}
                    className={footerLink}
                  >
                    {link.label}
                  </MarketingLink>
                </li>
              }
            </FooterColumn>
          }
        </div>
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>{`© ${new Date().getFullYear()} JXD Ltd`}</p>
        <a href={brand.author.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
          {`Built by ${brand.author.name}`}
        </a>
      </div>
    </div>
  </footer>
}
