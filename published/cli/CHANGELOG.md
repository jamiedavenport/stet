# @jxdltd/onyx-cli

## 0.3.1

### Patch Changes

- 4d75b80: License changed from MIT to Apache-2.0. The Apache license adds an explicit patent grant; permissions are otherwise equivalent for consumers.

## 0.3.0

### Minor Changes

- 0ed3720: Add organization billing to the public API: `client.orgBilling()` returns the plan, subscription state, and member usage (`GET /org/billing`), and `onyx org` shows the plan.
- 0ed3720: Nest the organization procedures in the API contract: `client.org()` is now `client.org.current()` and `client.orgBilling()` is now `client.org.billing()`. The HTTP paths (`/org`, `/org/billing`) are unchanged.

## 0.2.1

### Patch Changes

- 4f461d2: Point the default origin at the production domain onyx.jxd.dev.

## 0.2.0

### Minor Changes

- df0ef50: New `onyx org` command: shows the organization an API key is scoped to via the typed Onyx API client (`--api-key` flag or `ONYX_API_KEY` env var, `--json` for machine output).

## 0.1.0

### Minor Changes

- 02a963c: Initial release with `onyx login` (browser device authorization) and `onyx whoami`.
