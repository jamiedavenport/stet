# @stetcms/vite

Vite plugin for products built on [Stet](https://github.com/jamiedavenport/stet). It generates a typed content client from your organization's content model before every build and dev-server start: the collections and maps your content team shapes in the Stet UI become `stet.<slug>.list()` / `.get()` calls your editor autocompletes. While the dev server runs it keeps watching, so a field added in the Stet UI reaches your types moments later without a restart.

Building without Vite? [`stet generate`](https://github.com/jamiedavenport/stet/tree/main/published/cli#stet-generate) runs the same codegen from the command line, for Next.js apps and CI.

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

With `STET_API_KEY` set, the plugin fetches `/api/v1/model` and writes `src/stet.gen.ts`:

```ts
import { stet } from './stet.gen';

const posts = await stet.posts.list(); // a collection
const post = await stet.posts.get('hello-world'); // one entry
const landing = await stet.landing.get(); // a map
// all fully typed from the model marketing built
```

The generated file never contains the key: at runtime the client reads `STET_API_KEY` from the environment again, so the file is safe to commit — and committing it keeps type checks working without a running Stet.

Codegen never fails your build. Without a key, or with the API unreachable, the plugin warns and leaves the previous generated file in place, writing an empty model only when no file exists yet. A deleted field disappears from the generated types on the next regeneration, so stale usage surfaces as a type error in your editor, never as a broken page.

## Options

| Option   | Default                           | Description                                                                   |
| -------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `origin` | `STET_ORIGIN` or the hosted cloud | The Stet deployment to generate from and call.                                |
| `apiKey` | `STET_API_KEY`                    | Organization API key used to fetch the model.                                 |
| `output` | `src/stet.gen.ts`                 | Where the generated module goes, relative to root.                            |
| `watch`  | `true`                            | Regenerate every few seconds while the dev server runs. Never affects builds. |

See [`examples/tanstack`](https://github.com/jamiedavenport/stet/tree/main/examples/tanstack) for a complete TanStack Start app built on the generated client.

## License

Apache-2.0
