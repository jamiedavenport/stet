import { fileURLToPath } from 'node:url';
import { paraglideVitePlugin, type CompilerOptions } from '@inlang/paraglide-js';
import { brand } from '@repo/brand';

/**
 * The single source of truth for how catalogs compile: `src/compile.ts` (the
 * install-time build) and the Vite plugin below must agree or they would
 * overwrite each other's output.
 */
export const paraglideOptions = {
  project: fileURLToPath(new URL('../project.inlang', import.meta.url)),
  outdir: fileURLToPath(new URL('./paraglide', import.meta.url)),
  strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
  cookieName: `${brand.slug}-locale`,
  emitTsDeclarations: true,
} satisfies CompilerOptions;

/**
 * Compiles `messages/{locale}.json` into `src/paraglide` and recompiles on
 * edit. Add to the app's Vite config so message changes hot-reload in dev.
 */
export function paraglide(): ReturnType<typeof paraglideVitePlugin> {
  return paraglideVitePlugin(paraglideOptions);
}
