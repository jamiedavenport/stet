// The single source of truth for product identity. Forks rebrand here
// (and swap src/assets/logo.svg) instead of hunting through the apps.
export const brand = {
  name: 'Onyx',
  // Machine identifier derived from the name: cookie names, the API key
  // prefix, the log service, and analytics tags. Worker and Cloudflare
  // resource names follow it by convention (`<slug>-web`, `<slug>-db`, ...)
  // but live in wrangler.jsonc, which cannot import this file.
  slug: 'onyx',
  description: 'The TypeScript starter kit from jxd.dev',
  url: 'https://onyx.jxd.dev',
  docs: 'https://onyx-docs.jxd.dev',
  email: 'hello@jxd.dev',
  author: {
    name: 'jxd.dev',
    url: 'https://jxd.dev',
  },
};
