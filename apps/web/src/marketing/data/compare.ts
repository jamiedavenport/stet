/**
 * Every comparison answers the same seven questions in the same order, so
 * the pages can be read against each other rather than only against Stet.
 */
export const axes = [
  { id: 'modelling', question: 'Who models the content' },
  { id: 'types', question: 'Types in your app' },
  { id: 'change', question: 'When the model changes' },
  { id: 'analytics', question: 'Analytics' },
  { id: 'ai', question: 'AI' },
  { id: 'hosting', question: 'Hosting and licence' },
  { id: 'pricing', question: 'How pricing works' },
] as const;

export type AxisId = (typeof axes)[number]['id'];

/** Stet's own column, written once and shared by every comparison. */
export const stetAnswers: Record<AxisId, string> = {
  modelling: 'Marketing, in the UI. Collections, maps and fields with no deploy.',
  types: 'A typed client generated from the live model by a Vite plugin.',
  change: 'A removed field becomes a deprecation in the types. The build stays green.',
  analytics: 'Included. First-party and cookieless, through your own infrastructure.',
  ai: 'Included. Drafting, rewriting and delegated tasks, approving every write, plus an MCP server for your own agent.',
  hosting: 'Hosted cloud or self-hosted. Open source.',
  pricing: '$10 per user per month. Free to self-host.',
};

export type Rival = {
  slug: string;
  /** The product's own name, as it writes it. */
  name: string;
  /** Their primary domain, which is how logo.dev is asked for their mark. */
  domain: string;
  /** One line for the comparison index. */
  tagline: string;
  /** What the page opens with: where this product genuinely sits. */
  summary: string;
  /** Fair credit, in its own words rather than as a concession. */
  strength: string;
  /** Their answer on each shared axis. */
  theirs: Record<AxisId, string>;
  /** The honest case for choosing them instead. */
  pickThem: string;
};

/** Competitor facts were checked against published documentation in July 2026. */
export const researchedOn = 'July 2026';
