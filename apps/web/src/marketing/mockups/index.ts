import type { ComponentType } from 'react';
import { brand } from '@repo/brand';

import type { FeatureSlug } from '#/marketing/data/features';
import { AnalyticsMockup } from '#/marketing/mockups/analytics.tsrx';
import { AssistantMockup } from '#/marketing/mockups/assistant.tsrx';
import { ClientMockup, DeprecationMockup } from '#/marketing/mockups/client.tsrx';
import { CollectionMockup } from '#/marketing/mockups/collection.tsrx';
import { EditorMockup } from '#/marketing/mockups/editor.tsrx';
import { FieldTypeMockup } from '#/marketing/mockups/model.tsrx';

/** A mockup with the line that says what it is showing. */
export type Showcase = {
  key: string;
  render: ComponentType;
  caption: string;
  /** An external link to follow from here, where one is the obvious next step. */
  link?: { label: string; href: string };
};

/** Everything a feature page shows, in order. The first is its lead image. */
export const featureShowcases: Record<FeatureSlug, Showcase[]> = {
  content: [
    {
      key: 'collection',
      render: CollectionMockup,
      caption:
        'A collection is a table: entries are rows, the fields marketing added are columns, and everyone editing it can see everyone else.',
    },
    {
      key: 'field-types',
      render: FieldTypeMockup,
      caption: 'Adding a field is picking its type. Twelve of them, available immediately.',
    },
    {
      key: 'editor',
      render: EditorMockup,
      caption:
        'Rich text edits on a page of its own, with live cursors and comments anchored to the sentence they are about.',
    },
  ],
  'code-generation': [
    {
      key: 'client',
      render: ClientMockup,
      caption:
        'The fields from that collection, arriving in the editor as typed properties on the generated client.',
      link: { label: 'Set up the client', href: `${brand.docs}` },
    },
    {
      key: 'deprecation',
      render: DeprecationMockup,
      caption:
        'A field removed from the model becomes a deprecation in the types. Nothing goes red, and nobody is paged.',
    },
  ],
  analytics: [
    {
      key: 'dashboard',
      render: AnalyticsMockup,
      caption:
        'Traffic, top pages and custom events, gathered through your own infrastructure and shown beside the content they describe.',
    },
  ],
  ai: [
    {
      key: 'assistant',
      render: AssistantMockup,
      caption:
        'The assistant docked beside the work, stopping on an approval card before it changes anything.',
    },
  ],
};

/** The single mockup that represents a feature on the landing page. */
export const landingMockups: Record<FeatureSlug, ComponentType> = {
  content: EditorMockup,
  'code-generation': ClientMockup,
  analytics: AnalyticsMockup,
  ai: AssistantMockup,
};
