---
'@stetcms/analytics': patch
'@stetcms/client': patch
'@stetcms/config': patch
'@stetcms/cli': patch
'@stetcms/vite': patch
---

Package metadata now describes what these packages are to someone who has never
heard of Stet, and every README links into the documentation.

Each `description` names the category once, and the keyword sets carry `cms`,
`headless-cms` and `stetcms` so an npm search for the category finds them at all;
previously the only shared keyword was `stet`, a brand with nothing behind it yet.
`homepage` now points at each package's reference page on docs.stetcms.com rather
than at a GitHub copy of the README the reader is already looking at, and the
cross-links between packages follow it there.

`@stetcms/analytics`, `@stetcms/client` and `@stetcms/config` declare
`sideEffects: false`, so bundlers can drop unused exports from consumer builds.
`@stetcms/client` declares `engines.node >= 20`, which the other four already did.
