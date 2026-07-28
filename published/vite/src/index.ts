import type { Plugin, ResolvedConfig } from 'vite';

const id = 'virtual:stet';
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

/** Options for {@link stet}. */
export type StetPluginOptions = {
  /**
   * Values exposed to application code as the default export of the
   * `virtual:stet` module. Serialized with `JSON.stringify`, so they must be
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
 * Vite plugin scaffold for products built on Stet. Exposes `config` to
 * application code through the `virtual:stet` module and runs the `generate`
 * hook before each build.
 */
export function stet(options: StetPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'stet',
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
