import type { Doc } from 'yjs';

// How a room says "the content behind this page changed, read it again": a
// counter on the room's shared document. Nothing reads its value, only the
// change event, so the two ends of the signal need agree on nothing but
// where it lives. The room bumps it, inside the Durable Object (see
// `notifyContentChanged` in ./document); every page open on it watches.

const root = 'content';
const key = 'version';

/** Signals everyone in the room that the content behind it changed. */
export function bumpContentVersion(doc: Doc): void {
  const map = doc.getMap<number>(root);
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Runs `onBump` on every bump the room sends, and returns the unsubscribe. */
export function observeContentVersion(doc: Doc, onBump: () => void): () => void {
  const map = doc.getMap<number>(root);
  map.observe(onBump);
  return () => {
    map.unobserve(onBump);
  };
}
