import { FileTextIcon, LayersIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * A collection holds many entries addressed by slug; a map is a single entry
 * addressed by its own name. Both are modelled in the UI by marketing and
 * served to navigation by the content model query.
 */
export type ContentKind = 'collection' | 'map';

/** The slice of a content type navigation needs to list it. */
export type NavContentType = {
  readonly slug: string;
  readonly name: string;
  readonly kind: ContentKind;
};

/** The icon a content type carries everywhere it is listed. */
export function contentIcon(kind: ContentKind): LucideIcon {
  return kind === 'collection' ? LayersIcon : FileTextIcon;
}
