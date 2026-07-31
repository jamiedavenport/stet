---
'@stetcms/analytics': minor
---

Added `enabled` to `createAnalyticsHandler`, so tracking can be switched off without taking the organization API key away.

The key was the only switch: no key meant no events. That works until the same key is needed for something else, which it is as soon as a project generates its content client, because then it is real on every developer's machine and their browsing lands in the project the dashboards read. `enabled` separates the two. It defaults to whether a key resolved, so nothing changes for a deployment that does not set it, and a disabled handler answers `200 { accepted: 0 }` while still validating each batch against the plan.
