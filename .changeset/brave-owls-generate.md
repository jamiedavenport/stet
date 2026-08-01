---
'@stetcms/cli': minor
---

Add `--if-key` to `stet generate`: succeed without generating when no API key is set, so build scripts like `stet generate --if-key && next build` also pass in environments that build against the committed generated client. With a key set, failures still fail.
