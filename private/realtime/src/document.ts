import { and, database, eq, schema } from '@repo/db';
import * as Sentry from '@sentry/cloudflare';
import type { Server } from 'partyserver';
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from 'yjs';

import { documentBodyText, entryIdFromPage } from './entry';

// D1 caps a row at 2 MB. A Yjs update grows with edit history, so a very
// long-lived document can reach it; failing here names the room, where a bare
// D1 rejection would not.
const maxStateBytes = 1_500_000;

export type DocumentRoom = {
  organizationId: string;
  page: string;
};

/**
 * Splits a room name into the parts the `document` table is keyed by. Rooms
 * are named `${organizationId}:${page}` by the worker, and a page is always a
 * pathname, so the first colon is the separator.
 */
export function parseRoomName(name: string): DocumentRoom | null {
  const separator = name.indexOf(':');
  if (separator <= 0) {
    return null;
  }
  const page = name.slice(separator + 1);
  if (page.length === 0) {
    return null;
  }
  return { organizationId: name.slice(0, separator), page };
}

/**
 * Writes the document's whole state, replacing whatever the room had before.
 * A Yjs update already carries every change, so there is nothing to append to.
 */
export async function saveDocument(room: DocumentRoom, doc: Doc): Promise<number> {
  const state = encodeStateAsUpdate(doc);
  if (state.byteLength > maxStateBytes) {
    throw new Error(
      `Document ${room.organizationId}:${room.page} is ${state.byteLength} bytes, over the ${maxStateBytes} byte limit.`,
    );
  }

  const db = await database();
  const updatedAt = new Date();
  await db
    .insert(schema.document)
    .values({ organizationId: room.organizationId, page: room.page, state, updatedAt })
    .onConflictDoUpdate({
      target: [schema.document.organizationId, schema.document.page],
      set: { state, updatedAt },
    });

  return state.byteLength;
}

/**
 * Mutates the live document through its room, so connected editors see the
 * change at once and the room's own flush mirrors it to D1. The doc the
 * callback receives is a replica of the room's current state; only the
 * changes made inside the callback travel back as a Yjs update, so
 * concurrent edits merge instead of being overwritten. Requires the host
 * worker to carry the `PAGE_PRESENCE` binding.
 */
export async function updateDocument(
  room: DocumentRoom,
  mutate: (doc: Doc) => void,
): Promise<void> {
  const stub = await roomStub(room);
  const doc = await fetchLiveDocument(stub, room);

  const before = encodeStateVector(doc);
  doc.transact(() => mutate(doc));
  // slice() narrows the buffer to ArrayBuffer, which is what BodyInit wants.
  const diff = encodeStateAsUpdate(doc, before).slice();

  const applied = await stub.fetch('https://room/document', { method: 'PUT', body: diff });
  if (!applied.ok) {
    throw new Error(
      `Writing document ${room.organizationId}:${room.page} failed (${applied.status}).`,
    );
  }
}

/**
 * Bumps the room's content version (see ./version), so pages open on it read
 * their content again. This is how a write that never joined the room — the
 * public API, the assistant's tools, an import — reaches the people who have
 * it open. The counter transaction runs inside the room, which broadcasts it
 * like any other edit.
 *
 * Best-effort, like the content webhooks: a refresh someone else misses is
 * not a reason to fail the write that earned it.
 */
export async function notifyContentChanged(room: DocumentRoom): Promise<void> {
  // Unit tests run this domain code under plain Node, where there is no
  // binding, and so nobody who could have the page open either.
  if ((await roomNamespace()) === undefined) {
    return;
  }
  try {
    const stub = await roomStub(room);
    const bumped = await stub.fetch('https://room/content-version', { method: 'POST' });
    if (!bumped.ok) {
      throw new Error(
        `Bumping the content version of ${room.organizationId}:${room.page} failed (${bumped.status}).`,
      );
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}

/**
 * The document as the room holds it right now, waking the room if needed.
 * Unlike `loadDocument` this never trails the live state, so it is what
 * anything answering about current content (the AI tools) should read;
 * the D1 copy remains the cheaper read where a flush of staleness is fine.
 */
export async function loadLiveDocument(room: DocumentRoom): Promise<Doc> {
  return fetchLiveDocument(await roomStub(room), room);
}

async function roomStub(room: DocumentRoom) {
  // Both lazy: partyserver itself imports `cloudflare:workers`, which only
  // resolves inside the worker, and this module is also loaded by tests.
  const [{ env }, { getServerByName }] = await Promise.all([
    import('cloudflare:workers'),
    import('partyserver'),
  ]);
  const namespace = (env as { PAGE_PRESENCE: DurableObjectNamespace<Server> }).PAGE_PRESENCE;
  return getServerByName(namespace, `${room.organizationId}:${room.page}`);
}

/** The rooms binding, or undefined outside a worker, where there are none. */
async function roomNamespace(): Promise<DurableObjectNamespace<Server> | undefined> {
  try {
    const { env } = await import('cloudflare:workers');
    return (env as { PAGE_PRESENCE?: DurableObjectNamespace<Server> }).PAGE_PRESENCE;
  } catch {
    return undefined;
  }
}

async function fetchLiveDocument(
  stub: Awaited<ReturnType<typeof roomStub>>,
  room: DocumentRoom,
): Promise<Doc> {
  const current = await stub.fetch('https://room/document');
  if (!current.ok) {
    throw new Error(
      `Reading document ${room.organizationId}:${room.page} failed (${current.status}).`,
    );
  }
  const doc = new Doc();
  applyUpdate(doc, new Uint8Array(await current.arrayBuffer()));
  return doc;
}

/**
 * Mirrors the document's body text onto its entry row, so the search index
 * (see `@repo/db`'s `search/indexes.ts`) follows the bodies at the same
 * cadence as the D1 copy. Pages that are not entries, and entries already
 * deleted, are no-ops. Body edits count as updating the entry, which is why
 * `updatedAt` moves with the mirror.
 */
export async function syncEntryBodyText(room: DocumentRoom, doc: Doc): Promise<void> {
  const entryId = entryIdFromPage(room.page);
  if (entryId === null) {
    return;
  }
  const db = await database();
  await db
    .update(schema.contentEntry)
    .set({ bodyText: documentBodyText(doc), updatedAt: new Date() })
    .where(
      and(
        eq(schema.contentEntry.id, entryId),
        eq(schema.contentEntry.organizationId, room.organizationId),
      ),
    );
}

/**
 * The persisted document as a `Y.Doc`, or null if the room has never saved.
 *
 * This is how anything outside a realtime session reads collaborative state:
 * server functions, the public API, exports. The same accessors the client
 * uses on a live room work on the returned doc, because it is the same
 * document, so callers type their own roots (`doc.getMap`, `doc.getXmlFragment`).
 *
 * It trails the live room by at most one flush interval (see PagePresenceRoom),
 * which is what makes it a "last saved" view rather than a live one, and why
 * `updatedAt` comes back with it.
 */
export async function loadDocument(
  room: DocumentRoom,
): Promise<{ doc: Doc; updatedAt: Date } | null> {
  const saved = await loadDocumentState(room);
  if (saved === null) {
    return null;
  }

  const doc = new Doc();
  applyUpdate(doc, saved.state);
  return { doc, updatedAt: saved.updatedAt };
}

/** The stored update and when it was written, without rehydrating a document. */
export async function loadDocumentState(
  room: DocumentRoom,
): Promise<{ state: Uint8Array; updatedAt: Date } | null> {
  const db = await database();
  const row = await db.query.document.findFirst({
    where: and(
      eq(schema.document.organizationId, room.organizationId),
      eq(schema.document.page, room.page),
    ),
  });
  if (row === undefined) {
    return null;
  }
  return { state: row.state, updatedAt: row.updatedAt };
}
