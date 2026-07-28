import type { ReactNode } from 'react';
import { getLocale } from '@repo/i18n';
import type { Locale as PolicyLocale } from '@policystack/sdk';

// PolicyStack components ship unstyled with data-op-* attributes; these
// Tailwind v4 arbitrary-variant rules put them in the marketing type scale.
const policyStyles = [
  '**:data-op-section:mb-10 **:data-op-section:border-b **:data-op-section:border-border **:data-op-section:pb-10',
  '**:data-op-heading:text-xl **:data-op-heading:font-semibold **:data-op-heading:tracking-tight **:data-op-heading:mb-4',
  '**:data-op-paragraph:text-sm **:data-op-paragraph:text-muted-foreground **:data-op-paragraph:leading-relaxed **:data-op-paragraph:mb-3',
  '**:data-op-list:list-disc **:data-op-list:list-inside **:data-op-list:space-y-1 **:data-op-list:text-sm **:data-op-list:text-muted-foreground **:data-op-list:mb-3',
  '**:data-op-table:w-full **:data-op-table:border **:data-op-table:border-border **:data-op-table:border-collapse **:data-op-table:text-sm **:data-op-table:my-3',
  '**:data-op-table-header:bg-muted/50',
  '**:data-op-table-row:border-b **:data-op-table-row:border-border',
  '**:data-op-table-cell:border **:data-op-table-cell:border-border **:data-op-table-cell:px-3 **:data-op-table-cell:py-2 **:data-op-table-cell:align-top **:data-op-table-cell:text-left',
].join(' ');

/**
 * PolicyStack translates the boilerplate it emits (headings, disclosures,
 * dates) for the site locale; config-authored content stays in the language
 * the config wrote it.
 */
export function policyLocale(): PolicyLocale {
  return getLocale() as PolicyLocale;
}

export function PolicyPageBody({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-8 pb-24 lg:px-8">
      <div className={policyStyles}>{children}</div>
    </div>
  );
}
