// The single source of truth for product identity.
export const brand = {
  name: 'Stet',
  // Machine identifier derived from the name: cookie names, the API key
  // prefix, the log service, and analytics tags. Worker and Cloudflare
  // resource names follow it by convention (`<slug>-web`, `<slug>-db`, ...)
  // but live in wrangler.jsonc, which cannot import this file.
  slug: 'stet',
  description: 'The CMS for marketing and engineering',
  url: 'https://stetcms.com',
  docs: 'https://docs.stetcms.com',
  /** Where "Book a demo" goes: half an hour with the engineer who builds it. */
  demo: 'https://cal.eu/jxd-dev/chat-about-stet',
  repository: 'https://github.com/jamiedavenport/stet',
  email: 'hello@jxd.dev',
  author: {
    name: 'jxd.dev',
    url: 'https://jxd.dev',
  },
};
