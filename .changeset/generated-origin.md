---
'@stetcms/client': minor
'@stetcms/vite': minor
'@stetcms/cli': minor
---

The generated content client now reads `STET_ORIGIN` at runtime, falling back to the origin it was generated against, so it resolves its origin the same way it already resolved its API key.

Previously the origin was baked in as a literal. Because codegen deliberately never fails a build — without a key it keeps the last generated file — a build in an environment with no `STET_API_KEY` could ship a client still pointed at whatever origin a developer last generated from, typically `http://localhost:3000`. The symptom was content silently failing to load rather than an error naming the cause.

Behaviour change for anyone who both commits `stet.gen.ts` and sets `STET_ORIGIN` at runtime to something other than the origin they generated against: the environment now wins.
