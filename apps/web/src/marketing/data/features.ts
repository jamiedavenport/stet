/** The four things Stet does, each with a page of its own. */
export type FeatureSlug = 'content' | 'code-generation' | 'analytics' | 'ai';

export type Feature = {
  slug: FeatureSlug;
  /** Short label used in navigation and on cards. */
  name: string;
  /** One line, for the features index and the homepage band. */
  tagline: string;
  title: string;
  lede: string;
  /** The claims the page is built from, in order. */
  points: { term: string; detail: string }[];
};

export const features: Feature[] = [
  {
    slug: 'content',
    name: 'Content',
    tagline: 'Model it in the UI, write it together, discuss it in place.',
    title: 'Content teams model it themselves.',
    lede: 'Collections and maps, with the fields you actually need, designed in the interface the way you think about content. No ticket, no deploy, no waiting on another sprint.',
    points: [
      {
        term: 'Collections and maps',
        detail:
          'A collection holds many entries that share a shape: posts, case studies, authors. A map is a single entry on its own: a landing page, your site settings. Both are made in a couple of seconds, and named and renamed in place.',
      },
      {
        term: 'Twelve field types',
        detail:
          'Text, rich text, number, checkbox, date, select, multi-select, link, person, asset, reference and multi-reference. Enough to describe real content, few enough to choose between without reading a manual.',
      },
      {
        term: 'A table, not a form',
        detail:
          'Entries are rows and fields are columns, so a whole collection is scannable and editable at once. Adding a column is adding a field, and it is available to your app immediately.',
      },
      {
        term: 'Written together',
        detail:
          'Live cursors in the table and in the body. Two people on the same entry see each other rather than overwrite each other, and every change is saved as it is made.',
      },
      {
        term: 'Comments on the words',
        detail:
          'Discussion is attached to the sentence it is about, not filed in a separate tool where it loses its subject.',
      },
      {
        term: 'Publishing is yours to shape',
        detail:
          'Stet serves what is saved. Drafts, review states and scheduling are a field on the model and a branch in your app, so the workflow is the one your team actually uses rather than the one a CMS assumed.',
      },
    ],
  },
  {
    slug: 'code-generation',
    name: 'Code generation',
    tagline: 'The content model becomes a typed client, and stays current.',
    title: 'The model becomes an API your editor knows.',
    lede: 'A Vite plugin reads the content model marketing built and writes a typed client into your repository. It keeps up as the model changes, and it never fails your build.',
    points: [
      {
        term: 'Generated from the live model',
        detail:
          '@stetcms/vite pulls the current model and writes a client into your source tree. It is committed like any other generated file, so a fresh checkout builds without reaching the network.',
      },
      {
        term: 'Autocomplete over real content',
        detail:
          'The fields marketing added are the properties your editor offers, with their real types. A select field arrives as a union of its options, a reference as the entry it points at.',
      },
      {
        term: 'Deletions arrive as deprecations',
        detail:
          'Remove a field and it becomes deprecated in the generated types, still serving the last value it held. Your build stays green, your editor shows the strikethrough, and you migrate when it suits you.',
      },
      {
        term: 'Calls shaped like the content',
        detail:
          'Collections answer list and get by slug. A map answers get, because there is only one. Nothing to configure: the shape of the call follows the shape of the model.',
      },
      {
        term: 'More than the client',
        detail:
          'A REST API and SDKs when the plugin is not the right fit, a CLI for scripting, seeding and CI, and webhooks on content events to trigger rebuilds and syncs.',
      },
      {
        term: 'Rendering stays yours',
        detail:
          'Stet has no hosted preview and no page builder. Your application renders your content, which means a preview is just your own app reading a different view through the same client.',
      },
    ],
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    tagline: 'First-party, cookieless, and next to the content it describes.',
    title: 'Numbers that sit next to the words.',
    lede: 'Product analytics routed through your own infrastructure and shown beside the content it belongs to. No consent banner, no blocked pixel, no fourth tab to go and check.',
    points: [
      {
        term: 'Through your infrastructure',
        detail:
          'Events post to a route in your own application and are enriched server-side before they reach Stet. An ad-blocker sees a first-party request to your own domain, because that is exactly what it is.',
      },
      {
        term: 'No consent banner',
        detail:
          'Cookieless by design. Nothing is stored on the reader device, so there is no interstitial between someone and the page you wrote for them.',
      },
      {
        term: 'Attached to the content',
        detail:
          'Content served through the client reports its own performance, so an entry has numbers from the moment its page exists, with no instrumentation written for it.',
      },
      {
        term: 'Typed events',
        detail:
          'Custom events are typed at the call site, so a renamed property is a compile error rather than a silent gap in a chart. Marketing builds on the same events in the UI.',
      },
      {
        term: 'Tracking never throws',
        detail:
          'Analytics failures are swallowed on purpose. A metrics outage is never allowed to become a customer-facing one.',
      },
    ],
  },
  {
    slug: 'ai',
    name: 'AI',
    tagline: 'An assistant in the session, that asks before it writes.',
    title: 'An assistant in the room, not in a side tab.',
    lede: 'It reads your content model, drafts and rewrites copy, and can take a whole task. Anything that changes your content stops and waits for a human first.',
    points: [
      {
        term: 'In the same session',
        detail:
          'The assistant docks beside your work and keeps the conversation as you move around the app, so context does not reset every time you open a different entry.',
      },
      {
        term: 'Approve before it writes',
        detail:
          'Reading the model, listing entries and searching happen freely. Creating a collection, adding a field or changing an entry stops on a card showing the exact change, and waits for you to allow it.',
      },
      {
        term: 'Suggestions you accept or reject',
        detail:
          'Editorial help arrives in the editor as marked changes to take or leave, not as a wall of replacement prose you have to diff by eye.',
      },
      {
        term: 'It knows your content',
        detail:
          'Search runs across your entries, so answers come from what you have actually written rather than from a general impression of your industry.',
      },
      {
        term: 'Delegate the whole task',
        detail:
          'Give it a job rather than a prompt: add the field, fill it in across the drafts, and report back. You stay in the loop at every write.',
      },
    ],
  },
];

export function findFeature(slug: string): Feature | undefined {
  return features.find((feature) => feature.slug === slug);
}
