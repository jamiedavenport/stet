import type { Plugin, ResolvedConfig } from 'vite';

const id = 'virtual:onyx';
const resolvedId = `\0${id}`;

/**
 * Build details passed to the `generate` hook, taken from the resolved Vite
 * config.
 */
export type GenerateContext = {
  /** Absolute path of the project root. */
  root: string;
  /** `build` for production builds, `serve` for the dev server. */
  command: 'build' | 'serve';
  /** Resolved mode, `production` or `development` unless overridden. */
  mode: string;
};

/** Options for {@link onyx}. */
export type OnyxPluginOptions = {
  /**
   * Values exposed to application code as the default export of the
   * `virtual:onyx` module. Serialized with `JSON.stringify`, so they must be
   * JSON-safe.
   */
  config?: Record<string, unknown>;
  /**
   * Codegen hook, awaited once when a build starts (and when the dev server
   * starts) before any module is loaded. Write generated files from here.
   */
  generate?: (context: GenerateContext) => void | Promise<void>;
};

/**
 * Vite plugin scaffold for products built on Onyx. Exposes `config` to
 * application code through the `virtual:onyx` module and runs the `generate`
 * hook before each build.
 */
export function onyx(options: OnyxPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'onyx',
    configResolved(config) {
      resolvedConfig = config;
    },
    async buildStart() {
      if (options.generate !== undefined) {
        await options.generate({
          root: resolvedConfig.root,
          command: resolvedConfig.command,
          mode: resolvedConfig.mode,
        });
      }
    },
    resolveId(source) {
      if (source === id) {
        return resolvedId;
      }
    },
    load(id) {
      if (id === resolvedId) {
        return `export default ${JSON.stringify(options.config ?? {})};\n`;
      }
    },
  };
}
