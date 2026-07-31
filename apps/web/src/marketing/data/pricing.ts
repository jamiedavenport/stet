/** The three ways to run Stet. */
export type Plan = {
  id: 'cloud' | 'self-hosted' | 'enterprise';
  name: string;
  price: string;
  /** The line under the price. Every plan carries one so the cards line up. */
  unit: string;
  description: string;
  /** Feature lines take no trailing period: they are list items, not sentences. */
  includes: string[];
  cta: string;
  /** Only one plan carries the filled button. */
  emphasised: boolean;
};

const everything = [
  'Collections, maps and all twelve field types',
  'Realtime editing, version history and rollback',
  'The generated typed client and Vite plugin',
  'REST API, CLI, MCP server and webhooks',
  'First-party cookieless analytics',
  'AI drafting and delegated tasks',
];

export const plans: Plan[] = [
  {
    id: 'cloud',
    name: 'Cloud',
    price: '$10',
    unit: 'per user, per month',
    description:
      'Run by us, on Cloudflare. The whole product, with nothing held back for a higher tier.',
    includes: [...everything, 'Unlimited collections, entries and projects', 'Email support'],
    cta: 'Start free',
    emphasised: true,
  },
  {
    id: 'self-hosted',
    name: 'Self-hosted',
    price: 'Free',
    unit: 'on your own infrastructure',
    description: 'The same product, deployed to your own Cloudflare account. Open source.',
    includes: [
      ...everything,
      'Your own database, storage and queues',
      'Community support on GitHub',
    ],
    cta: 'Read the deploy guide',
    emphasised: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    unit: 'quoted against what you need',
    description: 'For organisations that need contracts, review and a person to call.',
    includes: [
      'Everything in Cloud or self-hosted',
      'Organization roles and an audit log',
      'Data residency review',
      'Security review and a signed agreement',
      'Onboarding and migration help',
      'A named contact and an SLA',
    ],
    cta: 'Book a demo',
    emphasised: false,
  },
];

/** Answers to the questions the pricing page reliably gets asked. */
export const pricingFaqs = [
  {
    term: 'What counts as a user?',
    detail:
      'Anyone with a seat in your workspace. Readers of your site are never counted, and neither are API requests from your application.',
  },
  {
    term: 'Is the free self-hosted version cut down?',
    detail:
      'No. It is the same code, running on your own Cloudflare account. You provide the database, storage and queues, and you keep the whole product.',
  },
  {
    term: 'What happens if we stop paying?',
    detail:
      'Your content stays reachable through the API and the CLI so you can export it. Locking your own words away from you would be a strange way to earn a renewal.',
  },
  {
    term: 'Do you charge for traffic?',
    detail:
      'No. Analytics ingest runs on its own budget and does not spend your API quota, because a busy site makes far more tracking calls than content reads.',
  },
];
