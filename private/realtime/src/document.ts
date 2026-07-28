import { and, database, eq, schema } from '@repo/db';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';

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
