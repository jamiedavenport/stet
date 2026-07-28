# @stet/cli

Stet from the command line, for scripting, seeding, and CI.

## Install

```bash
npm install -g @stet/cli
# or run without installing
npx @stet/cli login
```

## Usage

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

### `stet org`

Show the organization an API key is scoped to, including its billing plan.

```bash
stet org --api-key stet_...   # or set STET_API_KEY
stet org --json
```

## Configuration

- `STET_API_URL`: default server origin for `stet login`.
- The session token is stored at `~/.config/stet/auth.json` (`$XDG_CONFIG_HOME/stet/auth.json` when set) with `0600` permissions. Delete the file to log out.

## Development

This package lives in the [Stet](https://github.com/jamiedavenport/stet) monorepo under `published/cli` and is built with `vp pack` (Vite+). Releases are versioned with Changesets and published from CI.

```bash
vp install
vp run build --filter @stet/cli
```

## License

Apache-2.0
