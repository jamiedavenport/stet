# @repo/realtime

Realtime collaboration and presence on Durable Objects.

- `./server`: `PagePresenceRoom`, a [y-partyserver](https://github.com/threepointone/y-partyserver) `YServer`. One Durable Object per `organizationId:page` room speaks the Yjs sync and awareness protocols over WebSockets; the document persists in the DO's SQLite storage across hibernation and restarts, and is mirrored to D1 so it also survives the Durable Object.
- `./document`: reading and writing that D1 copy. `loadDocument({ organizationId, page })` returns the persisted `Y.Doc` with the time it was saved, for anything running without a session: server functions, the public API, exports.
- `./client`: the React side, providing the shared Y.Doc and presence to components such as the collaborative Tiptap editor in the web app (`apps/web/src/notes`).

Binding: `PAGE_PRESENCE` in `apps/web/wrangler.jsonc`, plus the `document` table in `@repo/db`. Local dev simulates the Durable Object.

## Persistence

The room writes its own storage on every save, then flushes to D1 on a storage alarm a few seconds later. The database therefore trails the live room slightly, which is why `loadDocument` returns `updatedAt` alongside the document: it is a last-saved view, not a live one. A room whose DO storage is empty reloads from D1, so the database is the copy that outlives everything else.

Only rooms carrying shared state ever write. `onSave` runs off the document's own update events, so pages that use a room for presence alone never create a row.

## Reading a document

The accessors that read a live room read a persisted one, because it is the same document:

```ts
import { loadDocument } from '@repo/realtime/document';

const saved = await loadDocument({ organizationId, page: '/app/tasks' });
const tasks = saved === null ? [] : readTasks(getTaskMap(saved.doc));
```

Roots come back untyped, so name them as the client does (`doc.getMap`, `doc.getXmlFragment`); `apps/web/src/tasks/doc.ts` and `apps/web/src/notes/doc.ts` are both written to work either way.

## Tests

```bash
pnpm test
```

The unit tests cover the D1 round trip against an in-memory sqlite database. The document's path through a real room is covered end to end by `apps/web/e2e/notes.spec.ts`.
