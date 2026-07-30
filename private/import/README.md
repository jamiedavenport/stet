# @repo/import

Imports an existing site's content into Stet: discovery, AI model proposal, AI extraction, and the executor the `site-import` workflow runs. The wizard in `apps/web/src/import` drives it; nothing here owns a route or a binding.

The demo-era approach is deliberate: plain `fetch` plus HTML stripping, no headless browser and no crawler service. Client-rendered sites extract poorly; static and server-rendered sites, which is most blogs, work. Swapping in a scraping service later means changing `fetchPage` (and, for discovery, `discoverSite`) only, since everything downstream consumes `FetchedPage`.

## Exports

- `./discover`: `discoverSite(url)` inventories a site from `sitemap.xml` (index-aware), falling back to same-origin links on the entry page, and groups URLs by first path segment. Capped at 300 pages.
- `./page`: `fetchPage(url, cap)` fetches and strips HTML for the model; JSON-LD script tags survive because publish dates live there.
- `./propose`: `proposeModel(model, { origin, groups })` asks the chat model for a content model (collections, maps, fields with extraction hints) from sampled pages. Drafts only; the wizard's review step decides.
- `./extract`: `extractEntry(model, { page, type })` pulls one entry (title, values, markdown bodies) out of one page, constrained to the planned fields. `steer` carries the user's corrections from the preview step.
- `./plan`: the shapes the wizard and workflow exchange (`ImportPlan`, `ImportItem`, `ImportProgress`) and `entrySlugFromUrl`, which keeps source permalink slugs.
- `./run`: `createModelFromPlan` and `importPage`, the executor. Pages run sequentially so slug uniquing and select option creation stay race-free. `person` fields are never planned: imported authors have no member row, so they land as text.
- `./status`: reads and writes the `import_run` row (see `private/db/src/schema/imports.ts`), which is both the workflow's progress feed and the wizard's report.

## Known demo limits

- Images in imported bodies keep their original URLs; nothing is copied to storage yet.
- Only published, publicly reachable pages import. No drafts, no locales.
- A retried workflow batch can duplicate entries (slug uniquing appends a suffix); there is no import ledger yet.

## Commands

```bash
pnpm tc     # type check
pnpm test   # vitest
```
