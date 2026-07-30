---
'@stetcms/client': minor
'@stetcms/vite': minor
---

A field deleted from the content model now reaches the generated client as a deprecation instead of disappearing. The key stays in `stet.gen.ts` carrying a `/** @deprecated */` doc comment, so your editor strikes it through wherever you read it and your build keeps passing while you migrate. Previously the field vanished on the next regeneration, which — with the dev server's three-second watch — turned a deletion someone else made in the Stet UI into a type error moments later.
