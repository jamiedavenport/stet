---
'@stetcms/client': minor
'@stetcms/vite': minor
---

A field deleted from the content model now reaches the generated client as a deprecation instead of disappearing. The key stays in `stet.gen.ts` carrying a `/** @deprecated */` doc comment naming the day it was deleted and who deleted it, so your editor strikes it through wherever you read it, your build keeps passing while you migrate, and a key you meet months later can be traced to someone who can explain it. Previously the field vanished on the next regeneration, which — with the dev server's three-second watch — turned a deletion someone else made in the Stet UI into a type error moments later.
