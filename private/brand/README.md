# @repo/brand

The single source of truth for product identity, shared by every app and package.

- `@repo/brand`: the `brand` object (name, slug, description, URLs). Plain TypeScript, safe to import from the CLI, email templates, and server code.
- `@repo/brand/mark`: the `BrandMark` React logo component.
- `@repo/brand/author-mark`: the `AuthorMark` jxd.dev logo, for "built by" attribution. A fork deletes this rather than redrawing it.
- `@repo/brand/logo.svg`: the raw logo file. Both apps import it (with `?url`) for their favicons.

## Rebranding a fork

1. Edit the `brand` object in `src/index.ts`. The `slug` drives machine identifiers: cookie names, the API key prefix, the log service, and analytics tags.
2. Replace `src/assets/logo.svg` and the polygons in `src/mark.tsx` with your own logo.

The web app shell, docs site, emails, favicons, and OG images pick the changes up from here. What does not, such as Cloudflare resource names and the marketing content, is listed in the [Make it your own](../../apps/docs/content/docs/make-it-your-own.mdx) guide.
