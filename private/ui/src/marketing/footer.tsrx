import { brand } from '@repo/brand';
import { getLocale, isLocale, languageName, locales, type Locale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { MarketingLink, Wordmark } from './ui.tsrx';

const footerLink = 'text-muted-foreground hover:text-foreground';

type FooterLink = { label: () => string; to?: LinkProps['to']; href?: string; hash?: string };

// Message functions, not calls: the columns live at module scope, so calling
// here would freeze the locale at import time. Each render invokes label().
const columns: { title: () => string; links: FooterLink[] }[] = [
  {
    title: m.marketing_footer_product,
    links: [
      { label: m.marketing_nav_changelog, to: '/changelog' },
      { label: m.marketing_nav_docs, href: brand.docs },
      { label: m.marketing_nav_github, href: brand.repository },
    ],
  },
  {
    title: m.marketing_footer_resources,
    links: [
      { label: m.marketing_nav_blog, to: '/blog' },
      { label: m.marketing_nav_contact, to: '/contact' },
      { label: () => brand.author.name, href: brand.author.url },
    ],
  },
  {
    title: m.marketing_footer_legal,
    links: [
      { label: m.privacy_policy, to: '/privacy' },
      { label: m.cookie_policy_title, to: '/cookies' },
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

// A native select rather than the app's Select: the marketing footer keeps to
// plain elements that restyle freely.
function LanguageSelect({ onSelect }: { onSelect: (locale: Locale) => void }) @{
  <label className="flex items-center gap-2">
    <span>{m.marketing_language()}</span>
    <select
      value={getLocale()}
      onChange={(event) => {
        if (isLocale(event.target.value)) {
          onSelect(event.target.value);
        }
      }}
      className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground hover:text-foreground"
    >
      @for (const locale of locales; key locale) {
        <option value={locale}>{languageName(locale)}</option>
      }
    </select>
  </label>
}

/** `onLocaleChange` applies the visitor's language choice. The app persists it
 * to the account when signed in, so the stored preference cannot overwrite the
 * choice on the next request. */
export function MarketingFooter({
  onLocaleChange,
}: {
  onLocaleChange: (locale: Locale) => void;
}) @{
  <footer className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[36ch] text-sm text-muted-foreground">
            {m.marketing_footer_tagline({ description: brand.description })}
          </p>
          <p className="mt-6 text-sm">
            <a href={`mailto:${brand.email}`} className="font-medium hover:underline">
              {brand.email}
            </a>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          @for (const column of columns; key column.title) {
            <FooterColumn title={column.title()}>
              @for (const link of column.links; key link.to ?? link.href) {
                <li>
                  <MarketingLink to={link.to} hash={link.hash} href={link.href} className={footerLink}>
                    {link.label()}
                  </MarketingLink>
                </li>
              }
            </FooterColumn>
          }
        </div>
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>{m.marketing_copyright({ year: new Date().getFullYear() })}</p>
        <div className="flex flex-wrap items-center gap-4">
          <LanguageSelect onSelect={onLocaleChange} />
          <a href={brand.author.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {m.marketing_built_by({ authorName: brand.author.name })}
          </a>
        </div>
      </div>
    </div>
  </footer>
}
