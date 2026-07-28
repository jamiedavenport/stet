---
title: Crons, background jobs, and workflows
date: 2026-07-22
tags: [jobs]
---

Three kinds of background work on Cloudflare primitives: scheduled jobs on Cron Triggers, typed queue-backed jobs with a dead-letter queue, and durable multi-step workflows. Crons and workflows register in code and merge into the Worker config at build time, so adding one never means editing deployment config in a second place.
