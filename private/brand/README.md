# @repo/brand

The single source of truth for product identity, shared by every app and package.

- `@repo/brand`: the `brand` object (name, slug, description, URLs). Plain TypeScript, safe to import from the CLI, email templates, and server code.
- `@repo/brand/mark`: the `BrandMark` React logo component. The current mark is a placeholder: the proofreader's stet, a line of text with dots beneath it, "let it stand".
- `@repo/brand/author-mark`: the `AuthorMark` jxd.dev logo, for "built by" attribution.
- `@repo/brand/logo.svg`: the raw logo file. Both apps import it (with `?url`) for their favicons.

## Changing the identity

1. Edit the `brand` object in `src/index.ts`. The `slug` drives machine identifiers: cookie names, the API key prefix, the log service, and analytics tags.
2. Replace `src/assets/logo.svg` and the shapes in `src/mark.tsx` together; they must stay the same drawing.

The web app shell, docs site, emails, favicons, and OG images pick the changes up from here. Cloudflare resource names (`stet-web`, `stet-db`, ...) follow the slug by convention but live in `wrangler.jsonc` and [DEPLOY.md](../../DEPLOY.md).
