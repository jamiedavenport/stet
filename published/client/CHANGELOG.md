# @jxdltd/onyx-client

## 0.4.0

### Minor Changes

- fe2344d: Breaking: `org.billing()` now reports usage per feature instead of member counts. The `members` and `memberLimit` fields are replaced by a `usage` array of `{ feature, used, cap, window }` rows, and every authenticated request counts against the organization's API request quota (429 `QUOTA_EXCEEDED` once the plan's monthly cap is reached).

### Patch Changes

- 4d75b80: License changed from MIT to Apache-2.0. The Apache license adds an explicit patent grant; permissions are otherwise equivalent for consumers.

## 0.3.0

### Minor Changes

- a1eff14: Add webhook endpoint management: list, create, and delete endpoints, rotate signing secrets, and list recent deliveries. Deliveries are signed per the Standard Webhooks spec.

## 0.2.0

### Minor Changes

- 0ed3720: Add organization billing to the public API: `client.orgBilling()` returns the plan, subscription state, and member usage (`GET /org/billing`), and `onyx org` shows the plan.
- 0ed3720: Nest the organization procedures in the API contract: `client.org()` is now `client.org.current()` and `client.orgBilling()` is now `client.org.billing()`. The HTTP paths (`/org`, `/org/billing`) are unchanged.

## 0.1.2

### Patch Changes

- 4f461d2: Point the default origin at the production domain onyx.jxd.dev.

## 0.1.1

### Patch Changes

- Republish with correct exports. 0.1.0 was published with npm, which ignores pnpm's `publishConfig.exports` override, so its exports pointed at `./src/index.ts` which is not in the package. Publishing now goes through `pnpm publish -r` so the dist exports are applied.

## 0.1.0

### Minor Changes

- df0ef50: First release: fully typed client for the Onyx API, generated from the oRPC contract. `createOnyxClient({ origin, apiKey })` authenticates with an organization API key (`x-api-key`) and exposes `health` and `org` (details of the organization the key is scoped to) over the REST endpoints under `/api/v1`, plus `safe` and `isDefinedError` helpers for typed error handling.
