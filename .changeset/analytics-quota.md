---
'@stetcms/analytics': patch
---

Recording events no longer spends the organization's API request quota, and ingest has its own rate limit rather than sharing the one sized for content reads. Analytics traffic is one request per browser batch, so the shared budget would have run out on a normally busy site — and because `track()` never throws, the first symptom would have been data quietly going missing.
