# @stetcms/cli

[![CI](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml/badge.svg)](https://github.com/jamiedavenport/stet/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-stetcms.com-black.svg)](https://docs.stetcms.com/reference/cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

[Stet](https://stetcms.com) from the command line, for scripting, seeding, and CI.

Stet is the CMS where marketing owns the content model and engineering gets a typed client generated from it.

## Install

```bash
npm install -g @stetcms/cli
# or run without installing
npx @stetcms/cli login
```

## Usage

### `stet init`

Write a `stet.config.ts` to start from, with the analytics block present but commented out. No network calls, so it works before you have a key.

```bash
npx stet init
```

| Flag              | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `--config <path>` | Where to write the config. Defaults to `./stet.config.ts`.             |
| `--output <path>` | Where the generated content client should go. Written into the config. |
| `--force`         | Overwrite an existing config.                                          |

`--output` defaults to `src/stet.gen.ts` when the project has a `src` directory and `stet.gen.ts` when it does not.

Without `--force`, an existing config is never replaced. Detection looks in every place [`@stetcms/vite`](https://docs.stetcms.com/reference/codegen) and this CLI look, so writing to the default location cannot shadow the config your project already loads: with `--force` and no `--config`, it overwrites the file it found rather than adding one at the root. An explicit `--config` is honoured as given, and if that path is somewhere the resolver will not look, the command says so rather than leaving you a config nothing reads.

The next steps it prints depend on the project. A project that builds with Vite is told to install the plugin and add `stet()` to `vite.config.ts`; anywhere else — Next.js, another bundler, a CI checkout — is told to install [`@stetcms/client`](https://docs.stetcms.com/reference/client) and run `stet generate`. The install line follows whichever package manager the project uses.

The config carries no `apiKey`. Export `STET_API_KEY` instead, so the file stays safe to commit. `init` does not edit your `package.json`.

### `stet generate`

Generate the typed content client from your organization's content model, exactly as [`@stetcms/vite`](https://docs.stetcms.com/reference/codegen) does at build time. Use it where there is no Vite: Next.js apps, other bundlers, or CI.

```bash
STET_API_KEY=stet_... stet generate
stet generate --key stet_... --url https://stet.example.com --output lib/stet.gen.ts
```

| Flag              | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `--url <origin>`  | Stet server origin. Defaults to `$STET_ORIGIN`, then the hosted app. |
| `--key <api-key>` | Organization API key. Defaults to `$STET_API_KEY`.                   |
| `--output <path>` | Where the generated module goes. Defaults to `src/stet.gen.ts`.      |
| `--config <path>` | Path to `stet.config.ts`. Auto-detected by default.                  |
| `--if-key`        | Succeed without generating when no API key is set.                   |

`--url`, `--key` and `--output` each override the matching key in `stet.config.ts`; `--config` chooses which file that is. Both this CLI and the Vite plugin read it (see [`@stetcms/config`](https://docs.stetcms.com/reference/configuration)).

`--if-key` exists for build scripts, so `stet generate --if-key && next build` can run in environments that have no `STET_API_KEY`, such as a CI job building against a committed generated client. It is the same behaviour [`@stetcms/vite`](https://docs.stetcms.com/reference/codegen) has without a key: say so, keep the file on disk, and carry on. Only the missing key is forgiven; with a key set, an unreachable server or a rejected key still fails the command.

The generated file imports [`@stetcms/client`](https://docs.stetcms.com/reference/client), so add that to your app's dependencies. It never contains the key: at runtime the client reads `STET_API_KEY` from the environment again, so the file is safe to commit. It reads `STET_ORIGIN` at runtime too, falling back to the origin it was generated against.

### `stet sync`

Publish your analytics tracking plan, so Stet can chart events your code declares before anyone has fired one. The same job [`@stetcms/vite`](https://docs.stetcms.com/reference/codegen) does on dev-server and build start; use this where there is no Vite, or in CI.

```bash
STET_API_KEY=stet_... stet sync
```

| Flag              | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `--url <origin>`  | Stet server origin. Defaults to `$STET_ORIGIN`, then the hosted app. |
| `--key <api-key>` | Organization API key. Defaults to `$STET_API_KEY`.                   |
| `--config <path>` | Path to `stet.config.ts`. Auto-detected by default.                  |

Replacement, not merge: an event deleted from your code disappears from the dashboard's list on the next sync, while anything already recorded under that name keeps its history.

### `stet login`

Log in through your browser using the OAuth device flow. The CLI shows a short code, opens the verification page, and waits for you to approve the request. No password ever touches the terminal.

```bash
stet login
```

| Flag             | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `--url <origin>` | Stet server origin. Defaults to `$STET_API_URL`, then the hosted app.      |
| `--no-open`      | Print the verification link instead of opening a browser. Useful over SSH. |

### `stet whoami`

Show the account you are logged in as.

```bash
stet whoami
stet whoami --json
```

`--json` prints the user, session, and active organization as JSON for scripting. The session token is never included in the output.

### `stet logout`

Clear the session stored on this machine. Running the command when already logged out also succeeds.

```bash
stet logout
```

### `stet org`

Show the organization an API key is scoped to, including its billing plan.

```bash
stet org --api-key stet_...   # or set STET_API_KEY
stet org --json
```

| Flag              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `--api-key <key>` | Organization API key. Defaults to `$STET_API_KEY`.                    |
| `--url <origin>`  | Stet server origin. Defaults to `$STET_API_URL`, then the hosted app. |
| `--json`          | Print the organization as JSON.                                       |

## Configuration

- `STET_API_URL`: default server origin for the account commands (`login`,
  `whoami`, `org`). `generate` and `sync` resolve theirs through
  `stet.config.ts` and `STET_ORIGIN` instead.
- The session token is stored at `~/.config/stet/auth.json` (`$XDG_CONFIG_HOME/stet/auth.json` when set) with `0600` permissions. Run `stet logout` to remove it.

## Development

This package lives in the [Stet monorepo](https://github.com/jamiedavenport/stet) under `published/cli` and is built with `vp pack` (Vite+). Releases are versioned with Changesets and published from CI.

```bash
vp install
vp run cli#build
```

The `stet` bin is `bin/stet.mjs`, a committed launcher that defers to the
bundled `dist/index.mjs`. It exists so pnpm can link the bin at install time
inside the monorepo, where `dist` is gitignored and only exists after the
build above; before that build it exits with a message saying to run it.

## License

Apache-2.0
