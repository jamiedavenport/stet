# @stetcms/config

[![CI](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml/badge.svg)](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-stetcms.com-black.svg)](https://docs.stetcms.com/reference/configuration)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

The shape of `stet.config.ts`: one file describing a project's whole
[Stet](https://stetcms.com) integration, read by
[`@stetcms/vite`](https://docs.stetcms.com/reference/codegen)
and [`@stetcms/cli`](https://docs.stetcms.com/reference/cli)
so the two can never disagree about which Stet a project talks to.

Stet is the CMS where marketing owns the content model and engineering gets a
typed client generated from it.

## Install

```bash
npm install @stetcms/config
```

## Usage

```ts
// stet.config.ts
import { defineAnalytics, event } from '@stetcms/analytics';
import { defineStet } from '@stetcms/config';
import { z } from 'zod';

export default defineStet({
  output: 'src/stet.gen.ts',
  analytics: defineAnalytics({
    events: { signup: event({ plan: z.enum(['free', 'paid']) }) },
  }),
});
```

| Key         | Default                           | Description                                                                                  |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `origin`    | `STET_ORIGIN` or the hosted cloud | The Stet deployment to generate from and send to.                                            |
| `apiKey`    | `STET_API_KEY`                    | Organization API key. Prefer the environment (see below).                                    |
| `output`    | `src/stet.gen.ts`                 | Where the generated content client goes.                                                     |
| `watch`     | `true`                            | Regenerate while the dev server runs.                                                        |
| `analytics` | none                              | The tracking plan, from [`defineAnalytics()`](https://docs.stetcms.com/reference/analytics). |

A plugin option or a CLI flag beats the config file, which beats the
environment, which falls back to the default. `resolveStetConfig()` is that
ladder, exported so both tools run the same one.

## Keep the key out of the file

`apiKey` exists for unusual setups, but a key written here is a key in your git
history. Export `STET_API_KEY` instead and leave it unset; everything else in
the config is safe to commit, and committing it is what keeps type checks
working without a running Stet.

## Why its own package

`defineStet` has to be loadable in two places that share no other code: build
tools load it under plain Node, and your app loads it again at runtime to serve
the analytics route. So this package has no dependencies and no relative
imports, and it keeps `analytics` opaque — the content client never has to know
what an event is, and the analytics SDK never has to know about codegen.

## License

Apache-2.0
