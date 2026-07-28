# apps/docs

The documentation site, built with [Fumadocs](https://fumadocs.dev) on TanStack Start and deployed as its own Cloudflare Worker (`stet-docs`).

## Development

```bash
vp dev apps/docs   # http://localhost:3100
```

## Commands

| Command        | Description                               |
| -------------- | ----------------------------------------- |
| `pnpm analyze` | Bundle report (Sonda)                     |
| `pnpm size`    | Bundle size budgets (also enforced in CI) |

## Syntax highlighting

Code blocks use a fine-grained Shiki highlighter defined in `src/lib/highlighter.ts`, not the `shiki` bundle entry. Add a language there before using it in a fence, otherwise it renders as plain text.

The bundle entry links every grammar as a lazy chunk, which put the Worker at 455 modules and 25 MiB and made `wrangler deploy` fail in CI. `src/lib/shiki-full.ts` plus the alias in `vite.config.ts` keeps `fumadocs-openapi`'s static fallback import from pulling it back in.

## Content

Docs are served from the site root: `content/docs/index.mdx` is `/`.

- `content/docs/*.mdx`: guide pages. Sidebar order lives in `meta.json` files.
- `content/docs/packages/`: one page per workspace package, documenting its public API.
- The API Reference section is generated at runtime from `private/api/openapi.json`, which is bundled into the Worker (`src/lib/openapi.ts`). Regenerate the spec with `pnpm generate:openapi` in `private/api` after changing the contract.

Every page is also served as raw markdown (append `.md`), and `/llms.txt` and `/llms-full.txt` expose the whole site for AI consumption.

## Branding

The navbar, titles, and favicon come from `@repo/brand`. Rebrand there, not here.

## Deploy

Merges to `main` deploy the site from CI (see [DEPLOY.md](../../DEPLOY.md)). To deploy by hand:

```bash
cd apps/docs && pnpm run deploy   # vp build && wrangler deploy
```

The Worker has no bindings or secrets.
