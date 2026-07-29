import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { syncTrackingPlan } from '@stetcms/analytics/sync';
import { fetchContentModel, renderContentModule } from '@stetcms/client/codegen';
import { resolveStetConfig } from '@stetcms/config';
import type { StetConfig } from '@stetcms/config';
import type { Plugin, ResolvedConfig } from 'vite';

// Self-referenced rather than imported as './config': Vite loads this plugin
// under plain Node, which resolves a package's own export map but not its
// extensionless relative paths.
import { findStetConfig, loadStetConfig, trackingPlanEvents } from '@stetcms/vite/config';

/** How often the dev server checks the model for changes. */
const watchIntervalMs = 3000;

/** Options for {@link stet}. Each one overrides the same key in `stet.config.ts`. */
export type StetPluginOptions = {
  /**
   * The Stet deployment to generate from. Defaults to the config file, then
   * `STET_ORIGIN`, then the hosted cloud.
   */
  origin?: string;
  /**
   * Organization API key used to fetch the model at codegen time. Defaults to
   * `STET_API_KEY`. Never written into the generated file: at runtime the
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
  /**
   * Path to `stet.config.ts`, relative to the project root. Auto-detected
   * when omitted; a project without one runs on this plugin's options alone.
   */
  config?: string;
};

/**
 * Generates a typed content client from your organization's content model
 * before every build and dev-server start: the collections and maps your
 * content team shapes become `stet.<slug>.list()` / `.get()` calls your
 * editor autocompletes. While the dev server runs it keeps watching, so a
 * field added in the Stet UI shows up in your types moments later.
 *
 * It also publishes the analytics tracking plan from `stet.config.ts`, so the
 * events your code declares can be charted in Stet before anyone has fired
 * one.
 *
 * Neither ever fails the build. Without a key or with the API unreachable it
 * warns and leaves the previous generated file in place, writing an empty
 * model only when no file exists yet.
 */
export function stet(options: StetPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig;
  let lastRendered: string | undefined;

  const configPath = () =>
    options.config === undefined
      ? findStetConfig(resolvedConfig.root)
      : resolve(resolvedConfig.root, options.config);

  /**
   * Read on every pass rather than cached, so editing the config during a
   * watch run takes effect without restarting the dev server.
   */
  const settle = async () => {
    const path = configPath();
    const file: StetConfig | undefined =
      path === undefined ? undefined : await loadStetConfig(path);
    const resolved = resolveStetConfig(file, options);
    return {
      ...resolved,
      output: resolve(resolvedConfig.root, resolved.output),
      events: trackingPlanEvents(file),
    };
  };

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
      const { origin, apiKey, output, events } = await settle();

      if (apiKey === undefined) {
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

      // Publishing the plan is a side errand, not part of producing the
      // bundle: an unreachable Stet carries on building either way.
      if (events !== undefined) {
        try {
          await syncTrackingPlan({ events, origin, apiKey });
        } catch (error) {
          this.warn(`[stet] Could not publish the tracking plan to ${origin}: ${String(error)}`);
        }
      }
    },
    configureServer(server) {
      const tick = async () => {
        try {
          const { origin, apiKey, output, watch } = await settle();
          if (!watch || apiKey === undefined) {
            return;
          }
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
