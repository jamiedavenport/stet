# @jxdltd/onyx-cli

Onyx from the command line.

## Install

```bash
npm install -g @jxdltd/onyx-cli
# or run without installing
npx @jxdltd/onyx-cli login
```

## Usage

### `onyx login`

Log in through your browser using the OAuth device flow. The CLI shows a short code, opens the verification page, and waits for you to approve the request. No password ever touches the terminal.

```bash
onyx login
```

| Flag             | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `--url <origin>` | Onyx server origin. Defaults to `$ONYX_API_URL`, then the hosted app.      |
| `--no-open`      | Print the verification link instead of opening a browser. Useful over SSH. |

### `onyx whoami`

Show the account you are logged in as.

```bash
onyx whoami
onyx whoami --json
```

`--json` prints the user, session, and active organization as JSON for scripting. The session token is never included in the output.

### `onyx org`

Show the organization an API key is scoped to, including its billing plan.

```bash
onyx org --api-key onyx_...   # or set ONYX_API_KEY
onyx org --json
```

## Configuration

- `ONYX_API_URL`: default server origin for `onyx login`.
- The session token is stored at `~/.config/onyx/auth.json` (`$XDG_CONFIG_HOME/onyx/auth.json` when set) with `0600` permissions. Delete the file to log out.

## Development

This package lives in the [Onyx](https://github.com/jamiedavenport/onyx) monorepo under `published/cli` and is built with `vp pack` (Vite+). Releases are versioned with Changesets and published from CI.

```bash
vp install
vp run build --filter @jxdltd/onyx-cli
```

## License

MIT
