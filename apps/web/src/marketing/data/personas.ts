import type { FeatureSlug } from '#/marketing/data/features';

export type PersonaSlug =
  | 'marketing'
  | 'engineering'
  | 'publishers'
  | 'agencies'
  | 'startups'
  | 'enterprise';

/** Who Stet is for, one page each. */
export type Persona = {
  slug: PersonaSlug;
  /** Full name, as the page heading uses it. */
  name: string;
  /** Short label for navigation and cards. */
  nav: string;
  tagline: string;
  title: string;
  lede: string;
  points: { term: string; detail: string }[];
  /** The feature pages worth reading next. */
  features: FeatureSlug[];
};

export const personas: Persona[] = [
  {
    slug: 'marketing',
    name: 'marketing teams',
    nav: 'Marketing',
    tagline: 'Add the field, write the page, watch the numbers. No ticket.',
    title: 'Ship the page without filing a ticket.',
    lede: 'The content model is yours. Add a collection, add a field, change your mind, and the engineering team picks it up without anyone being interrupted.',
    points: [
      {
        term: 'The waiting stops',
        detail:
          'A new field used to be a ticket, a sprint and a deploy. Here it is a menu. The collection is on the site as soon as you have made it.',
      },
      {
        term: 'One place, not four',
        detail:
          'Writing, history and performance all live on the content itself, instead of being spread across a CMS, a doc and an analytics tab.',
      },
      {
        term: 'You keep the numbers',
        detail:
          'Every entry carries its own analytics where you edit it. Cookieless and first-party, so no consent banner stands between you and your readers.',
      },
      {
        term: 'AI that does the work',
        detail:
          'Draft, rewrite, or hand over a whole task to an agent in the session. Every change it wants to make stops for you to approve first.',
      },
      {
        term: 'You cannot break the site',
        detail:
          'Removing a field cannot fail a build on the engineering side. That is a property of how Stet generates their client, not a promise that you will be careful.',
      },
    ],
    features: ['content', 'analytics', 'ai'],
  },
  {
    slug: 'engineering',
    name: 'engineers',
    nav: 'Engineers',
    tagline: 'A typed client you did not write, that cannot break your build.',
    title: 'A content API you did not have to write.',
    lede: 'The model marketing builds arrives in your repository as a typed client. It autocompletes, it type-checks, and nothing anyone does on the content side can turn your build red.',
    points: [
      {
        term: 'Typed from the model, not from a guess',
        detail:
          'A Vite plugin generates the client from the live content model. Selects arrive as unions, references as the entries they point at, and the whole thing updates as the model does.',
      },
      {
        term: 'Schema changes are information, not incidents',
        detail:
          'A deleted field becomes a deprecation in the generated types and keeps serving its last value. You find out in your editor, not from a failing pipeline at 5pm.',
      },
      {
        term: 'No CMS code to maintain',
        detail:
          'No schema files in your repository to review, no admin UI to keep running, no migration to write because someone wanted a subtitle.',
      },
      {
        term: 'Rendering stays yours',
        detail:
          'Stet is not a page builder and not a host. Your app renders your content, so previews and draft views are yours to build with the same client.',
      },
      {
        term: 'Analytics through your own infrastructure',
        detail:
          'Events post to a route in your app and are enriched server-side. Type-safe at the call site, immune to ad-blockers, and never able to throw in the browser.',
      },
      {
        term: 'Your agent works on the real model',
        detail:
          'An MCP server hands Claude, Cursor or whatever you code in the same tools the assistant uses: read the model, search entries, add a field, write a body. It is OAuth, so there is no key to paste, and every change it makes is attributed to you.',
      },
      {
        term: 'Open source, self-hostable',
        detail:
          'Run it on your own Cloudflare account if you would rather. The hosted version is a convenience, not a hostage situation.',
      },
    ],
    features: ['code-generation', 'content', 'ai', 'analytics'],
  },
  {
    slug: 'publishers',
    name: 'publishers',
    nav: 'Publishers',
    tagline: 'A room full of writers, and one place the work happens.',
    title: 'A newsroom pace, without a newsroom of tools.',
    lede: 'Editorial teams write more, together, and under more pressure than anyone else using a CMS. The writing, its history and the numbers that follow all sit on the piece itself.',
    points: [
      {
        term: 'Everyone in the same document',
        detail:
          'Live cursors in the body and in the table, so a writer and a sub-editor work on the same piece at once instead of passing versions back and forth.',
      },
      {
        term: 'Every version is recoverable',
        detail:
          'Each change is snapshotted as it happens, so a piece can be read back through its edits and any version restored. Nobody keeps a copy just in case.',
      },
      {
        term: 'A desk you can see',
        detail:
          'A collection is a table, so the whole slate is one screen: what is written, what is waiting on a read, and who has it. Status is a field you define, not a workflow we imposed.',
      },
      {
        term: 'Numbers on the piece',
        detail:
          'Every entry carries its own performance where it was written. No separate analytics tab, no consent banner between your readers and the story.',
      },
      {
        term: 'AI as a sub, not a byline',
        detail:
          'It drafts, rewrites and researches alongside you, and anything that would alter the piece stops on an approval card for a human first.',
      },
    ],
    features: ['content', 'ai', 'analytics'],
  },
  {
    slug: 'agencies',
    name: 'agencies',
    nav: 'Agencies',
    tagline: 'Hand over a CMS the client can extend without calling you.',
    title: 'Hand it over without handing over the maintenance.',
    lede: 'Build the site once, then let the client add collections and fields themselves. What they do cannot break what you shipped, so the handover actually ends.',
    points: [
      {
        term: 'The support queue shrinks',
        detail:
          '"Can you add a field for us" stops being a line item. The client adds it, and the site keeps working because a model change can never fail a build.',
      },
      {
        term: 'Your stack, not ours',
        detail:
          'Stet serves content through an API and a typed client. Whatever you build in, and wherever you deploy it, stays your decision.',
      },
      {
        term: 'One CMS across the roster',
        detail:
          'The same tool for every client instead of whichever CMS each of them arrived with. Your team learns it once.',
      },
      {
        term: 'Per-client hosting',
        detail:
          'Put each client on their own hosted workspace, or self-host on infrastructure you or they control when the contract requires it.',
      },
      {
        term: 'Cost you can quote',
        detail:
          'Ten dollars per person per month, with no per-project fee and no jump to enterprise pricing the moment you take on another client site.',
      },
    ],
    features: ['content', 'code-generation', 'analytics'],
  },
  {
    slug: 'startups',
    name: 'startups',
    nav: 'Startups',
    tagline: 'The whole product, ten dollars a seat, no sales call.',
    title: 'One tool, and nobody has to run procurement.',
    lede: 'Ten dollars per person per month for everything: the content model, the typed client, analytics and AI. Marketing and engineering share one workspace from the first week.',
    points: [
      {
        term: 'No feature held back',
        detail:
          'Analytics and AI are not an upsell tier. The plan is the product, and the price is on the pricing page rather than behind a form.',
      },
      {
        term: 'Two people can run it',
        detail:
          'One marketer and one engineer is a complete team here. Neither is blocked on the other, which matters most when there is no slack in the week.',
      },
      {
        term: 'One fewer integration',
        detail:
          'Content and product analytics arrive together, so there is no separate tool to wire up, pay for and reconcile before you can answer whether the blog is working.',
      },
      {
        term: 'Leaving is possible',
        detail:
          'Open source, self-hostable, with your content available through a plain REST API and a CLI. Staying should be a decision you keep making.',
      },
    ],
    features: ['content', 'code-generation', 'ai'],
  },
  {
    slug: 'enterprise',
    name: 'enterprises',
    nav: 'Enterprise',
    tagline: 'Self-host it, with roles and an audit log.',
    title: 'Run it yourself, on infrastructure you control.',
    lede: 'Open source and self-hostable on your own Cloudflare account, with organization roles and an audit log. Your content and your analytics never have to leave.',
    points: [
      {
        term: 'Self-hosted or hosted',
        detail:
          'The same product either way. Deploy it to your own account as a Worker with your own database and storage, or let us run it and keep the option open.',
      },
      {
        term: 'Roles that decide who administers',
        detail:
          'Owners and admins manage members, API keys, webhooks and billing; members write. Every entry point checks the membership row on the server rather than trusting the session.',
      },
      {
        term: 'An audit log',
        detail:
          'Who changed what, and when, recorded in the product rather than reconstructed from database timestamps after the fact.',
      },
      {
        term: 'Analytics that stays put',
        detail:
          'Events route through your own infrastructure by design. There is no third-party pixel to get past a privacy review, and no consent banner to add.',
      },
      {
        term: 'Read the source',
        detail:
          'The whole thing is open source. Security review means reading the code rather than filling in a questionnaire about it.',
      },
    ],
    features: ['content', 'analytics', 'code-generation'],
  },
];

export function findPersona(slug: string): Persona | undefined {
  return personas.find((persona) => persona.slug === slug);
}
