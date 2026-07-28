---
title: Public API with a typed client
date: 2026-07-22
tags: [api]
---

A public REST API defined contract-first with oRPC and Zod, authenticated with organization-scoped API keys in the `x-api-key` header. The contract generates an OpenAPI document and `@jxdltd/onyx-client`, a typed client published to npm, so consumers get the same types the server compiles against. CI also gained bundle-size budgets with an on-demand analyzer.
