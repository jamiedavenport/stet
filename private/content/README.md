# @repo/content

The content domain: the operations behind collections, maps, fields, entries, and rich text bodies. `apps/web`'s server functions and `@repo/ai`'s agent tools both run this code, which is what keeps a change made in chat identical to one made in the UI.

- `./schema`: field types, per-type config, and entry value parsing (client-safe).
- `./slug`: slug and key derivation (client-safe).
- `./model`, `./fields`, `./entries`: server-only operations over the content model and entries. Callers authenticate and resolve the organization first; every function takes it as the first argument.
- `./access`: server-only ownership checks (`requireContentType`, `requireField`, `requireEntry`).
- `./body`: the rich text body schema and its serialization: TipTap extensions, body-to-markdown, and markdown-to-body. Everything here renders to markdown, so the schema must not grow an extension the renderer does not know.
- `./write-body`: server-only body writes, routed through the entry's realtime room (see `@repo/realtime`) so open editors update live and the D1 mirror follows.
