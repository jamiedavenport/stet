# @repo/content

The content domain: the operations behind collections, maps, fields, entries, and rich text bodies. `apps/web`'s server functions and `@repo/ai`'s agent tools both run this code, which is what keeps a change made in chat identical to one made in the UI.

- `./schema`: field types, per-type config, and entry value parsing (client-safe).
- `./slug`: slug and key derivation (client-safe).
- `./model`, `./fields`, `./entries`: server-only operations over the content model and entries. Callers authenticate and resolve the organization first; every function takes it as the first argument, and an `Actor` (see `@repo/audit`) last, so every change records who made it and through which surface.
- Every operation here also calls `recordContentChange` from `@repo/webhooks/content`, which batches the organization's changes into one `content.changed` webhook per window. Emitting from this package rather than the server functions is what makes an edit from chat, the public API, or an import trigger a customer's rebuild exactly as one made in the UI does.
- And `broadcastContentChange`, which bumps the content version of the type's realtime room (see `@repo/realtime`) so tables open on it read it again. It lives here for the same reason: a browser only sees the writes it made itself, whoever else is writing. `./rooms` holds the page a room is named after, because the server has to address the room the watchers are actually in.
- `./access`: server-only ownership checks (`requireContentType`, `requireField`, `requireEntry`), plus `liveFields`. Deleting a field only stamps `deletedAt`, so readers go through `liveFields` to skip the tombstones; the one exception is `/api/v1/model`, which serves them flagged `deprecated` so the generated client marks the key instead of dropping it.
- `./body`: the rich text body schema and its serialization: TipTap extensions, body-to-markdown, and markdown-to-body. Everything here renders to markdown, so the schema must not grow an extension the renderer does not know.
- `./write-body`: server-only body writes, routed through the entry's realtime room (see `@repo/realtime`) so open editors update live and the D1 mirror follows.
- `./revisions`: entry version history. Every write here snapshots the entry (metadata, values, and bodies as markdown), coalescing one person's run of edits into a single revision; `restoreEntryRevision` puts an entry back, through the realtime room so open editors follow. Body edits that never pass through `./entries` are caught by the room's flush, which `apps/web` wires to `recordBodyRevision`.
- `./prune-revisions`: the cap that bounds the revision table, swept nightly by `@repo/crons`.
