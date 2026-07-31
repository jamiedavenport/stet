import { brand } from '@repo/brand';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { MarketingLink, Wordmark } from './ui.tsrx';
import type { MarketingNavLink } from './nav';

const footerLink = 'font-normal text-muted-foreground hover:text-foreground';

type FooterLink = {
  label: string;
  to?: LinkProps['to'];
  params?: LinkProps['params'];
  href?: string;
};

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Compare', to: '/compare' },
      { label: 'Book a demo', href: brand.demo },
    ],
  },
  {
    title: 'Who it is for',
    links: [
      { label: 'Marketing teams', to: '/for/$persona', params: { persona: 'marketing' } },
      { label: 'Engineers', to: '/for/$persona', params: { persona: 'engineering' } },
      { label: 'Publishers', to: '/for/$persona', params: { persona: 'publishers' } },
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

/**
 * Every comparison is listed rather than hidden behind the index: these are
 * the searches people arrive on, and one of them is why they are here.
 */
export function MarketingFooter({ comparisons }: { comparisons: MarketingNavLink[] }) @{
  <footer className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div>
        <Wordmark />
        <p className="mt-3 max-w-[52ch] text-sm text-muted-foreground">
          {`${brand.description}. Marketing owns the model, engineering gets a typed contract, and nothing breaks between them. Open source, and yours to run.`}
        </p>
        <p className="mt-6 text-sm">
          <a href={`mailto:${brand.email}`} className="font-medium hover:underline">
            {brand.email}
          </a>
        </p>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
        @for (const column of columns; key column.title) {
          <FooterColumn title={column.title}>
            @for (const link of column.links; key link.label) {
              <li>
                <MarketingLink
                  to={link.to}
                  params={link.params}
                  href={link.href}
                  className={footerLink}
                >
                  {link.label}
                </MarketingLink>
              </li>
            }
          </FooterColumn>
        }
        <FooterColumn title="Compare">
          @for (const comparison of comparisons; key comparison.label) {
            <li>
              <MarketingLink
                to={comparison.to}
                params={comparison.params}
                className={footerLink}
              >
                {comparison.label}
              </MarketingLink>
            </li>
          }
        </FooterColumn>
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>{`© ${new Date().getFullYear()} JXD Ltd`}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* The logo.dev free tier asks for this on commercial use. */}
          <a href="https://logo.dev" target="_blank" rel="noreferrer" className="hover:text-foreground">
            {"Logos provided by Logo.dev"}
          </a>
          <a href={brand.author.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {`Built by ${brand.author.name}`}
          </a>
        </div>
      </div>
    </div>
  </footer>
}
