# @stetcms/vite

Vite plugin for products built on [Stet](https://github.com/jamiedavenport/stet). It does two jobs from one config file:

- **Generates a typed content client** before every build and dev-server start: the collections and maps your content team shapes in the Stet UI become `stet.<slug>.list()` / `.get()` calls your editor autocompletes. While the dev server runs it keeps watching, so a field added in the Stet UI reaches your types moments later without a restart.
- **Publishes your analytics tracking plan**, so the events your code declares can be charted in Stet before anyone has fired one.

Building without Vite? [`stet generate`](https://github.com/jamiedavenport/stet/tree/main/published/cli#stet-generate) and [`stet sync`](https://github.com/jamiedavenport/stet/tree/main/published/cli#stet-sync) run the same two jobs from the command line, for Next.js apps and CI.

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

Everything is configured in `stet.config.ts` (see [`@stetcms/config`](https://github.com/jamiedavenport/stet/tree/main/published/config)), which the CLI reads too:

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

Neither job can fail your build. Without a key, or with the API unreachable, the plugin warns and leaves the previous generated file in place, writing an empty model only when no file exists yet. A field deleted in the Stet UI keeps its key in the generated types, marked `@deprecated`: your editor strikes it through wherever you read it, and your build keeps passing while you migrate.

## Analytics

A config that declares `analytics` has its tracking plan published on every dev-server and build start, so the dashboard can offer an event before it has ever been recorded. Dropping an event from your code drops it from that list on the next sync, while anything already recorded under that name keeps its history. See [`@stetcms/analytics`](https://github.com/jamiedavenport/stet/tree/main/published/analytics) for the plan itself and the route it feeds.

## Options

Each option overrides the same key in `stet.config.ts`; leave them off and the config file decides.

| Option   | Default                           | Description                                                                   |
| -------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `origin` | `STET_ORIGIN` or the hosted cloud | The Stet deployment to generate from and call.                                |
| `apiKey` | `STET_API_KEY`                    | Organization API key used to fetch the model.                                 |
| `output` | `src/stet.gen.ts`                 | Where the generated module goes, relative to root.                            |
| `watch`  | `true`                            | Regenerate every few seconds while the dev server runs. Never affects builds. |
| `config` | auto-detected                     | Path to `stet.config.ts`, relative to root.                                   |

See [`examples/tanstack`](https://github.com/jamiedavenport/stet/tree/main/examples/tanstack) for a complete TanStack Start app built on the generated client.

## License

Apache-2.0
