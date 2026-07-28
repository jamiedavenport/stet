import { registry } from './registry.ts';

// Wrangler `workflows` entries derived from the registry. Merged into the
// worker config by apps/web/vite.config.ts, so adding a workflow never
// requires touching wrangler.jsonc. Node loads this chain directly at vite
// config time, hence the explicit .ts extensions; it imports definitions
// only, never the classes.
export function workflowsConfig(): { name: string; binding: string; class_name: string }[] {
  return Object.values(registry).map((definition) => ({
    name: definition.name,
    binding: definition.binding,
    class_name: definition.className,
  }));
}
