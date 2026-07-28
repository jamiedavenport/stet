# @jxdltd/onyx-vite

Vite plugin for products built on [Onyx](https://github.com/jamiedavenport/onyx). It is a small working scaffold to grow product-specific build integration on: typed options, a `virtual:onyx` module exposing config to application code, and a codegen hook that runs before every build.

## Install

```bash
npm install -D @jxdltd/onyx-vite
```

## Usage

```ts
// vite.config.ts
import { onyx } from '@jxdltd/onyx-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    onyx({
      config: { origin: 'https://onyx.jxd.dev' },
      generate: async ({ root, command, mode }) => {
        // Write generated files under `root` here.
      },
    }),
  ],
});
```

Application code reads the config through the virtual module:

```ts
import config from 'virtual:onyx';

console.log(config.origin);
```

Declare the module with your config's shape (for example in `src/onyx.d.ts`):

```ts
declare module 'virtual:onyx' {
  const config: { origin: string };
  export default config;
}
```

## Options

| Option     | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `config`   | Values exposed as the default export of `virtual:onyx`. Serialized with `JSON.stringify`.       |
| `generate` | Awaited once when a build starts (and when the dev server starts), before any module is loaded. |

`generate` receives `{ root, command, mode }` from the resolved Vite config: `command` is `build` for production builds and `serve` for the dev server.

## License

MIT
