---
'@stetcms/client': patch
---

Make `entryTypeName` index-free so the codegen source type-checks in projects
with `noUncheckedIndexedAccess`, such as Nuxt's generated tsconfig.
