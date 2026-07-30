# apps/docs

The documentation site, built with [Blume](https://useblume.dev) and deployed as
its own Cloudflare Worker (`stet-docs`).

## Development

```bash
pnpm --filter @repo/docs dev   # http://localhost:3100
```

## Commands

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `pnpm build`    | Static build to `dist/`, failing on diagnostics |
| `pnpm validate` | Internal links, heading anchors, assets         |
| `pnpm size`     | Bundle size budgets (also enforced in CI)       |
| `pnpm tc`       | Type check (`astro check`)                      |

`blume build` refuses to run while a dev server is up, because both use the
generated `.blume` runtime. Stop the server, or pass `--isolated` to build
against `.blume-verify` instead.

The size budget sums every emitted chunk, which no single page downloads: the
pages are static HTML and the heavy pieces (mermaid, katex, the API reference)
load as islands only where they are used. Blume emits them whether or not a
page uses them, so the number is a regression guard, not a page weight.

## Content

Docs live in `docs/` and are served from the site root: `docs/index.mdx` is `/`.
Routes come from the filesystem with numeric filename prefixes stripped, so
`01-quickstart.mdx` is `/quickstart` and the prefix only orders the sidebar.

Three tabs divide the site, each scoped to a route prefix:

- **Guides** (`/`): the loose pages at the top level.
- **Reference** (`/reference`): one page per published package, plus the CLI.
- **API** (`/api`): generated at build time from `private/api/openapi.json`,
  which is itself generated from the oRPC contract. Regenerate it with
  `pnpm generate:openapi` in `private/api` after changing the contract.
  `docs/api/authentication.mdx` is hand-written and merges into the same tab.

Pages are MDX so they can use directives (`:::note`) and the built-in
components; both are inert in plain `.md`. Every page is also served as raw
markdown (append `.mdx`), and `/llms.txt` and `/llms-full.txt` expose the whole
site for AI consumption.

## Branding

`blume.config.ts` reads the name, description and URLs from `@repo/brand`.
`scripts/brand-assets.ts` copies the logo and favicon out of the same package
into the gitignored `public/`, rewriting the logo's fills to `currentColor` so
Blume's inlined copy follows the theme. Rebrand there, not here.

## Deploy

The build is static, so the Worker is an asset server: no `main`, no bindings,
no secrets. Merges to `main` deploy from CI (see
[DEPLOY.md](../../DEPLOY.md)). To deploy by hand:

```bash
cd apps/docs && pnpm run deploy   # blume build && wrangler deploy
```
