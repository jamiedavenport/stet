---
'@stetcms/client': minor
'@stetcms/vite': minor
---

Rich text fields now contain both sanitised HTML and markdown. Generated clients
type them as `ContentRichText`, and the content client resolves Stet asset URLs
inside both representations so bodies can be rendered without another markdown
dependency.
