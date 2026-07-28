import { FileTextIcon, LayersIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * A collection holds many entries addressed by slug; a map is a single entry
 * addressed by its own name. Both are modelled in the UI by marketing.
 */
export type ContentKind = 'collection' | 'map';

export type ContentType = {
  readonly slug: string;
  readonly name: string;
  readonly kind: ContentKind;
  /** Entries in the collection; maps are always one. */
  readonly entries: number;
  /** Entries with unpublished changes, shown as a sidebar count. */
  readonly drafts: number;
};

/**
 * The model this mockup renders. It stands in for the collections and maps a
 * customer builds in the Model editor, until that is backed by the database.
 */
export const contentModel = [
  { slug: 'posts', name: 'Posts', kind: 'collection', entries: 48, drafts: 3 },
  { slug: 'authors', name: 'Authors', kind: 'collection', entries: 12, drafts: 0 },
  { slug: 'case-studies', name: 'Case studies', kind: 'collection', entries: 9, drafts: 2 },
  { slug: 'changelog', name: 'Changelog', kind: 'collection', entries: 34, drafts: 0 },
  { slug: 'landing', name: 'Landing', kind: 'map', entries: 1, drafts: 1 },
  { slug: 'pricing', name: 'Pricing', kind: 'map', entries: 1, drafts: 0 },
] as const satisfies readonly ContentType[];

/** The icon a content type carries everywhere it is listed. */
export function contentIcon(kind: ContentKind): LucideIcon {
  return kind === 'collection' ? LayersIcon : FileTextIcon;
}

/** The type a `$collection` route param names, or undefined if the model has no such type. */
export function findContentType(slug: string): ContentType | undefined {
  return contentModel.find((type) => type.slug === slug);
}
