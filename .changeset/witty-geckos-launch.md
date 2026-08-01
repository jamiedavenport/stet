---
'@stetcms/vite': patch
---

Link the new Astro example from the README, alongside the TanStack Start one,
and say outright that frameworks building on Vite need nothing extra: in
Astro the plugin goes through `vite.plugins` and both jobs — client codegen
and tracking-plan publish — run unchanged. Verified against a seeded local
Stet.
