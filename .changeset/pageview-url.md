---
'@stetcms/analytics': patch
---

Documented per-framework pageview snippets for TanStack Router, Next.js, React Router, SvelteKit, Nuxt and Astro, and the reason single-page apps should turn `autoPageviews` off: the fallback patches `history.pushState` and so cannot see the `replaceState` a router uses for redirects and search-parameter changes.

Every snippet passes the router's URL to `pageview()` rather than letting it read `window.location`. By the time an effect or a navigation callback runs, the router has advanced and `window.location` may not have, so a bare call labels the view with the previous page — and the same-URL guard then silently drops every other one. Verified in a browser against the TanStack example, where it was doing exactly that.
