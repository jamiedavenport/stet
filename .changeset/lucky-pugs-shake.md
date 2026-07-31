---
'@stetcms/analytics': patch
---

Document that the analytics client runs on a server as well as in a browser.
It already guarded its listeners and automatic pageviews behind a `window`
check, but nothing said so, which left server-side events looking like a gap
in the package. Give it an absolute `endpoint` and it posts to the route you
already mounted, so signups and subscriptions can be recorded where they
happen without a second way to hold your API key.
