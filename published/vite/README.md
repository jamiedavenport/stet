# @stetcms/vite

[![CI](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml/badge.svg)](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-stetcms.com-black.svg)](https://docs.stetcms.com/reference/codegen)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

Vite plugin for products built on [Stet](https://stetcms.com), the CMS where marketing owns the content model and engineering gets a typed client generated from it. It does two jobs from one config file:

- **Generates a typed content client** before every build and dev-server start: the collections and maps your content team shapes in the Stet UI become `stet.<slug>.list()` / `.get()` calls your editor autocompletes. While the dev server runs it keeps watching, so a field added in the Stet UI reaches your types moments later without a restart.
- **Publishes your analytics tracking plan**, so the events your code declares can be charted in Stet before anyone has fired one.

Building without Vite? [`stet generate`](https://docs.stetcms.com/reference/cli#stet-generate) and [`stet sync`](https://docs.stetcms.com/reference/cli#stet-sync) run the same two jobs from the command line, for Next.js apps and CI.

New here? The [quickstart](https://docs.stetcms.com/quickstart) goes from an empty project to a typed content client in four steps.

## Install

```bash
npm install -D @stetcms/vite
npm install @stetcms/client
```

## Usage

```ts
// vite.config.ts
import { stet } from '@stetcms/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [stet()],
});
```

Frameworks that build on Vite need nothing extra — in Astro, the same plugin goes through `vite.plugins` in `astro.config.ts` and both jobs run unchanged.

Everything is configured in `stet.config.ts` (see [`@stetcms/config`](https://docs.stetcms.com/reference/configuration)), which the CLI reads too:

```ts
// stet.config.ts
import { defineStet } from '@stetcms/config';

export default defineStet({ output: 'src/stet.gen.ts' });
```

With `STET_API_KEY` set, the plugin fetches `/api/v1/model` and writes `src/stet.gen.ts`:

```ts
import { stet } from './stet.gen';

const posts = await stet.posts.list(); // a collection
const post = await stet.posts.get('hello-world'); // one entry
const landing = await stet.landing.get(); // a map
// all fully typed from the model marketing built
```

The generated file never contains the key: at runtime the client reads `STET_API_KEY` from the environment again, so the file is safe to commit — and committing it keeps type checks working without a running Stet. It reads `STET_ORIGIN` at runtime too, falling back to the origin it was generated against, so one committed file works in every environment rather than pinning your deployment to whatever origin last regenerated it.

Neither job can fail your build. Without a key, or with the API unreachable, the plugin warns and leaves the previous generated file in place, writing an empty model only when no file exists yet. A field deleted or renamed in the Stet UI keeps its retired key in the generated types, marked `@deprecated`: your editor strikes it through wherever you read it, and your build keeps passing while you migrate.

## Analytics

A config that declares `analytics` has its tracking plan published on every dev-server and build start, so the dashboard can offer an event before it has ever been recorded. Dropping an event from your code drops it from that list on the next sync, while anything already recorded under that name keeps its history. See [`@stetcms/analytics`](https://docs.stetcms.com/reference/analytics) for the plan itself and the route it feeds.

## Options

Each option overrides the same key in `stet.config.ts`; leave them off and the config file decides.

| Option   | Default                           | Description                                                                   |
| -------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `origin` | `STET_ORIGIN` or the hosted cloud | The Stet deployment to generate from and call.                                |
| `apiKey` | `STET_API_KEY`                    | Organization API key used to fetch the model.                                 |
| `output` | `src/stet.gen.ts`                 | Where the generated module goes, relative to root.                            |
| `watch`  | `true`                            | Regenerate every few seconds while the dev server runs. Never affects builds. |
| `config` | auto-detected                     | Path to `stet.config.ts`, relative to root.                                   |

See [`examples/tanstack`](https://github.com/jamiedavenport/stet/tree/main/examples/tanstack), [`examples/astro`](https://github.com/jamiedavenport/stet/tree/main/examples/astro) and [`examples/sveltekit`](https://github.com/jamiedavenport/stet/tree/main/examples/sveltekit) for complete TanStack Start, Astro and SvelteKit apps built on the generated client.

## License

Apache-2.0
