# @repo/realtime

Realtime collaboration and presence on Durable Objects.

- `./server`: `PagePresenceRoom`, a [y-partyserver](https://github.com/threepointone/y-partyserver) `YServer`. One Durable Object per `organizationId:page` room speaks the Yjs sync and awareness protocols over WebSockets; the document persists in the DO's SQLite storage across hibernation and restarts, and is mirrored to D1 so it also survives the Durable Object.
- `./document`: documents outside a session. `loadDocument({ organizationId, page })` returns the persisted D1 copy with the time it was saved; `loadLiveDocument` reads the room's current state (waking it if needed); `updateDocument` mutates through the room, so connected editors see the change immediately and concurrent edits merge. This is how the public API reads bodies and how the AI tools read and write them.
- `./entry`: the convention tying content entries to their body documents: `entryPage(id)`, `bodyField(key)`, `bodyFragment(doc, key)`, and the plain-text extraction the search mirror indexes with.
- `./client`: the React side, providing the shared Y.Doc and presence to components such as the collaborative Tiptap editor in the web app (`apps/web/src/content/body`).

Binding: `PAGE_PRESENCE` in `apps/web/wrangler.jsonc`, plus the `document` table in `@repo/db`. Local dev simulates the Durable Object.

## Persistence

The room writes its own storage on every save, then flushes to D1 on a storage alarm a few seconds later. The database therefore trails the live room slightly, which is why `loadDocument` returns `updatedAt` alongside the document: it is a last-saved view, not a live one. A room whose DO storage is empty reloads from D1, so the database is the copy that outlives everything else.

Only rooms carrying shared state ever write. `onSave` runs off the document's own update events, so pages that use a room for presence alone never create a row.

The flush also calls a protected `onFlush(room, doc)`, which does nothing here. It is the hook for work that needs the saved document but lives in a package depending on this one: `apps/web` overrides it to snapshot entry revisions (see `@repo/content`), which this package cannot import.

## Reading a document

The accessors that read a live room read a persisted one, because it is the same document:

```ts
import { loadDocument } from '@repo/realtime/document';

const saved = await loadDocument({ organizationId, page: '/app/tasks' });
const tasks = saved === null ? [] : readTasks(getTaskMap(saved.doc));
```

Roots come back untyped, so name them as the client does (`doc.getMap`, `doc.getXmlFragment`); the `./entry` helpers are written to work on live and rehydrated documents alike.

## Tests

```bash
pnpm test
```

The unit tests cover the D1 round trip against an in-memory sqlite database. The document's path through a real room is covered end to end by `apps/web/e2e/presence.spec.ts` and `apps/web/e2e/content.spec.ts`.
