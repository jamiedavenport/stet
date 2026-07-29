import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DEFAULT_ORIGIN, fetchContentModel, renderContentModule } from '@stetcms/client/codegen';
import type { Plugin, ResolvedConfig } from 'vite';

/** How often the dev server checks the model for changes. */
const watchIntervalMs = 3000;

/** Options for {@link stet}. */
export type StetPluginOptions = {
  /**
   * The Stet deployment to generate from. Defaults to `STET_ORIGIN`, falling
   * back to the hosted cloud.
   */
  origin?: string;
  /**
   * Organization API key used to fetch the model at codegen time. Defaults
   * to `STET_API_KEY`. Never written into the generated file: at runtime the
   * client reads `STET_API_KEY` from the environment again.
   */
  apiKey?: string;
  /** Where the generated module goes, relative to the project root. */
  output?: string;
  /**
   * Regenerate while the dev server runs, so model changes made in the Stet
   * UI reach the app without a restart. On by default; never affects builds.
   */
  watch?: boolean;
};

/**
 * Generates a typed content client from your organization's content model
 * before every build and dev-server start: the collections and maps your
 * content team shapes become `stet.<slug>.list()` / `.get()` calls your
 * editor autocompletes. While the dev server runs it keeps watching, so a
 * field added in the Stet UI shows up in your types moments later.
 *
 * Codegen never fails the build. Without a key or with the API unreachable it
 * warns and leaves the previous generated file in place, writing an empty
 * model only when no file exists yet.
 */
export function stet(options: StetPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig;
  let lastRendered: string | undefined;

  const settings = () => ({
    origin: options.origin ?? process.env.STET_ORIGIN ?? DEFAULT_ORIGIN,
    apiKey: options.apiKey ?? process.env.STET_API_KEY,
    output: resolve(resolvedConfig.root, options.output ?? 'src/stet.gen.ts'),
  });

  const write = async (output: string, code: string) => {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, code, 'utf8');
  };
  const exists = (output: string) =>
    access(output).then(
      () => true,
      () => false,
    );

  return {
    name: 'stet',
    configResolved(config) {
      resolvedConfig = config;
    },
    async buildStart() {
      const { origin, apiKey, output } = settings();

      if (apiKey === undefined || apiKey === '') {
        this.warn('[stet] STET_API_KEY is not set; skipping content client generation.');
        if (!(await exists(output))) {
          await write(output, renderContentModule({ types: [] }, origin));
        }
        return;
      }

      try {
        const model = await fetchContentModel(origin, apiKey);
        lastRendered = renderContentModule(model, origin);
        await write(output, lastRendered);
      } catch (error) {
        // Never break the customer's build: keep serving the last generated
        // client and say why it is stale.
        this.warn(`[stet] Could not refresh the content client from ${origin}: ${String(error)}`);
        if (!(await exists(output))) {
          await write(output, renderContentModule({ types: [] }, origin));
        }
      }
    },
    configureServer(server) {
      const { origin, apiKey, output } = settings();
      if (options.watch === false || apiKey === undefined || apiKey === '') {
        return;
      }

      const tick = async () => {
        try {
          const model = await fetchContentModel(origin, apiKey);
          const code = renderContentModule(model, origin);
          if (code !== lastRendered) {
            lastRendered = code;
            await write(output, code);
            server.config.logger.info(`[stet] Content model changed; regenerated ${output}`);
          }
        } catch {
          // Transient: the origin may be restarting; the next tick retries.
        }
      };

      const timer = setInterval(() => void tick(), watchIntervalMs);
      server.httpServer?.on('close', () => clearInterval(timer));
    },
  };
}
