/**
 * Stands in for `fumadocs-core/highlight/shiki/full` (see the alias in
 * `vite.config.ts`).
 *
 * That module is imported statically by `fumadocs-openapi/ui` purely as a
 * `??` fallback. Even when a factory is supplied, its `import('shiki')` stays
 * in the graph and every grammar chunk is still emitted. Pointing the
 * fallback at the app's own highlighter keeps the full bundle out entirely.
 */
export {
  shikiFactory as defaultShikiFactory,
  shikiFactory as wasmShikiFactory,
} from './highlighter';
