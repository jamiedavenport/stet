# @stet/vite

Vite plugin for products built on [Stet](https://github.com/jamiedavenport/stet). It is the scaffold the typed-client codegen grows on: typed options, a `virtual:stet` module exposing config to application code, and a codegen hook that runs before every build. Generating the content client from your project's model will plug into that hook.

## Install

```bash
npm install -D @stet/vite
```

## Usage

```ts
// vite.config.ts
import { stet } from '@stet/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stet({
      config: { origin: 'https://stetcms.com' },
      generate: async ({ root, command, mode }) => {
        // Write generated files under `root` here.
      },
    }),
  ],
});
```

Application code reads the config through the virtual module:

```ts
import config from 'virtual:stet';

console.log(config.origin);
```

Declare the module with your config's shape (for example in `src/stet.d.ts`):

```ts
declare module 'virtual:stet' {
  const config: { origin: string };
  export default config;
}
```

## Options

| Option     | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `config`   | Values exposed as the default export of `virtual:stet`. Serialized with `JSON.stringify`.       |
| `generate` | Awaited once when a build starts (and when the dev server starts), before any module is loaded. |

`generate` receives `{ root, command, mode }` from the resolved Vite config: `command` is `build` for production builds and `serve` for the dev server.

## License

Apache-2.0
