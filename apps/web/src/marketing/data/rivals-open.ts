import type { Rival } from '#/marketing/data/compare';

/** Comparisons against the self-hostable and open source options. */
export const openRivals: Rival[] = [
  {
    slug: 'wordpress',
    name: 'WordPress',
    domain: 'wordpress.org',
    tagline: 'The incumbent. Everyone can use it; nothing is typed.',
    summary:
      'WordPress runs a large share of the web for good reasons: content teams already know it, and there is a plugin for nearly everything. Used headlessly it shows its age. Custom fields usually arrive through a plugin, the REST API is untyped, and a change to a field is discovered by a reader rather than by a compiler.',
    strength:
      'The ecosystem has no equal, hosting is a commodity, and hiring someone who already knows the admin takes an afternoon.',
    theirs: {
      modelling:
        'Marketing, in the admin, though custom fields usually need a plugin and often a developer to register them.',
      types:
        'None by default. The REST API is untyped; teams add WPGraphQL and a code generator to get types.',
      change: 'Nothing warns anyone. A renamed field surfaces as an empty region at runtime.',
      analytics: 'A plugin, or a third-party script and the consent banner that comes with it.',
      ai: 'Plugins, of widely varying quality.',
      hosting: 'Self-hosted or managed hosting. Open source, GPL.',
      pricing: 'Free software. You pay in hosting, plugins and maintenance.',
    },
    pickThem:
      'Stay on WordPress if your site depends on its ecosystem, or if your team is large, non-technical and already fluent in it. Moving is a real project, and it should buy you something.',
  },
  {
    slug: 'payload',
    name: 'Payload',
    domain: 'payloadcms.com',
    tagline: 'A code-first CMS that lives inside your Next.js app.',
    summary:
      'Payload is the best code-first CMS available, and its type generation is excellent. Collections and fields are a TypeScript config in your repository, which is exactly right when engineering owns the model, and exactly the constraint Stet exists to remove. A marketer who wants one more field still needs a commit and a deploy.',
    strength:
      'Types are first-class, the config is genuinely pleasant to write, it installs into an existing Next.js app, and it is MIT licensed with no seat counting.',
    theirs: {
      modelling:
        'Developers, in code. Collections and fields are a TypeScript config, so a new field is a commit and a deploy.',
      types: 'Excellent. Generated from your config, in the repository that defines it.',
      change: 'Your own change, in your own repository, released on your own schedule.',
      analytics: 'Not included.',
      ai: 'Available through enterprise plugins.',
      hosting: 'Self-hosted, on infrastructure you run. Open source, MIT.',
      pricing: 'Free to self-host. Enterprise licensing for SSO and advanced workflow.',
    },
    pickThem:
      'Pick Payload if engineering owns the content model and wants it in code, or if you want the admin running inside the same Next.js application you already deploy.',
  },
  {
    slug: 'strapi',
    name: 'Strapi',
    domain: 'strapi.io',
    tagline: 'Open source, UI modelling, deploys to change the schema.',
    summary:
      'Strapi is the best known open source headless CMS, and its content-type builder does put modelling in the UI. The catch is where that model lives: the builder writes schema files to disk, so it is a development-time tool. In production the model is part of the deployment, and consuming apps are left to describe the API themselves.',
    strength:
      'Genuinely open source under MIT, self-hostable anywhere, with a plugin system and a large community behind it.',
    theirs: {
      modelling:
        'Either. The content-type builder is in the UI, but it writes schema files, so production changes go through a deploy.',
      types:
        'Generated inside the Strapi project. Apps consuming the API typically hand-write their own.',
      change: 'No deprecation path for the applications reading the API.',
      analytics: 'Not included.',
      ai: 'Available on paid tiers.',
      hosting: 'Self-hosted or Strapi Cloud. Open source, MIT.',
      pricing: 'Free to self-host. Cloud is priced per project, from $35 per month.',
    },
    pickThem:
      'Pick Strapi if you want a mature open source CMS on your own servers with a plugin ecosystem, and your content model is stable enough that changing it through a deploy is not a problem.',
  },
  {
    slug: 'directus',
    name: 'Directus',
    domain: 'directus.io',
    tagline: 'A data platform wrapped around your own SQL database.',
    summary:
      'Directus is not really a competitor so much as a different category: it points at an existing SQL database and gives you an API and an admin over it. That is a genuinely good answer when the data already exists and the database is the source of truth. It is a heavier answer when what you want is somewhere to write a blog.',
    strength:
      'Bring your own database, keep your existing schema, and get a REST and GraphQL API plus a capable admin over it without a migration.',
    theirs: {
      modelling: 'Both. Directus maps onto a SQL database, and fields are managed in the UI.',
      types: 'An SDK with generated types that you wire into your application yourself.',
      change: 'No deprecation path for the applications reading the API.',
      analytics: 'Insights dashboards over your own data, rather than web analytics.',
      ai: 'An AI assistant, included from the free tier.',
      hosting:
        'Self-hosted or cloud. Source-available under the Monospace Sustainable Core Licence since v12, free below $5M revenue and 50 staff, becoming GPL after four years.',
      pricing:
        'Free Core tier capped at three users, then $499 per month for ten seats and $50 per extra seat.',
    },
    pickThem:
      'Pick Directus if you already have the database and want an API and admin over it. Stet owns its own storage and is built for editorial content, not for fronting an existing schema.',
  },
];
