import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import { policyStack } from '@policystack/vite';
import { cronsConfig } from '@repo/crons/config';
import { workflowsConfig } from '@repo/workflows/config';
import { createDepScanTransformPlugin } from '@tsrx/core/vite/dep-scan';
import { compile } from '@tsrx/react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { stet } from '@stetcms/vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsrxReact from '@tsrx/vite-plugin-react';
import viteReact from '@vitejs/plugin-react';
import Sonda from 'sonda/vite';
import { defineConfig } from 'vite-plus';

// The worker reads STET_API_KEY as a binding, but the Stet plugin generating
// the content client is plain Node and reads process.env. Loading the same
// file here means one place to put the key. Node leaves already-set variables
// alone, so a value from the shell still wins.
const devVars = fileURLToPath(new URL('.dev.vars', import.meta.url));
if (existsSync(devVars)) {
  process.loadEnvFile(devVars);
}

const analyze = process.env.ANALYZE === '1';
// An unset repository secret still reaches the job as an empty string, so a
// presence check alone would run the upload with no credentials and fail the
// deploy.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const uploadSourceMaps = sentryAuthToken !== undefined && sentryAuthToken !== '';

// The raw-served router imports these two; when the optimizer misses them the
// CJS use-sync-external-store shim reaches the browser unbundled and its named
// import fails. Direct devDependencies make them resolvable here.
const routerDeps = ['@tanstack/react-store', 'use-sync-external-store/shim/with-selector.js'];

const config = (command: 'build' | 'serve') =>
  defineConfig({
    optimizeDeps: { include: routerDeps },
    environments: {
      // @tsrx/vite-plugin-react registers its dep scan through `config()`,
      // which only reaches the client environment, so the ssr scanner
      // externalizes every component and discovers what they import at request
      // time instead. Re-optimizing then renames the shared chunks workerd is
      // mid-import on and kills the dev server. Both keys are one unit: the
      // extension makes the scanner read `.tsrx`, the plugin makes it parse.
      // See "Upstream workarounds" in README.md.
      ssr: {
        optimizeDeps: {
          include: routerDeps,
          extensions: ['.tsrx'],
          rolldownOptions: {
            transform: { jsx: { importSource: 'react' } },
            plugins: [
              createDepScanTransformPlugin({
                name: 'stet:tsrx-ssr-dep-scan',
                filter: /\.tsrx$/,
                compile,
                imports: ['react/jsx-runtime'],
              }),
            ],
          },
        },
      },
    },
    server: {
      // Overridable so worktrees and CI can run side by side; keep it in sync
      // with BETTER_AUTH_URL (.dev.vars) and E2E_BASE_URL when set.
      port: Number(process.env.PORT ?? 3000),
    },
    build: {
      // Sonda reads sourcemaps to attribute bundle bytes to packages, and
      // Sentry needs them to resolve minified stack traces.
      sourcemap: analyze || uploadSourceMaps,
    },
    resolve: {
      tsconfigPaths: true,
      // Yjs must be a singleton: its types compare constructors, and in dev
      // the ssr optimizer can hand @tiptap/y-tiptap its own copy while
      // @repo/realtime uses the linked one, which breaks every conversion
      // ("Yjs was already imported" in the server log).
      dedupe: ['yjs'],
    },
    plugins: [
      // Reads src/stet.config.ts: regenerates src/stet.gen.ts from the content
      // model and publishes the tracking plan, on every dev-server and build
      // start. Without a key it warns and leaves the committed client alone.
      stet(),
      cloudflare({
        viteEnvironment: { name: 'ssr' },
        // Crons and workflows are declared in code (the @repo/crons and
        // @repo/workflows registries) and merged into the worker config here.
        // The resolved config reaches production too: `wrangler deploy` reads
        // the build output config, not wrangler.jsonc directly.
        config: {
          triggers: { crons: cronsConfig() },
          workflows: workflowsConfig(),
        },
      }),
      tailwindcss(),
      // Scans src for cookie/vendor usage and generates src/policystack.gen.ts,
      // which src/policystack.ts merges into the policy config; drift between
      // declared and actual usage fails the build. Build-only: the serve-time
      // gen writes retrigger the watcher and optimizer in a loop that breaks
      // hydration mid-run, and CI's build is where the gate matters.
      command === 'build' &&
        policyStack({
          srcDir: './src',
          thirdParties: { usePackageJson: true },
          // Accepted gaps, committed here so they show up in review: the
          // server-side vendors (Stripe, Resend, ...) are declared manually
          // because the scanner only sees browser code, and the placeholder
          // config has no support phone number.
          suppress: ['vendor-declared-not-used', 'company-contact-phone-recommended'],
        }),
      tanstackStart(),
      tsrxReact(),
      viteReact(),
      ...(analyze ? [Sonda()] : []),
      // Uploads source maps so Sentry stack traces point at real source. Only
      // in CI, where the token exists: a local build has nothing to upload to,
      // and a build without a Sentry account never triggers it.
      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
              authToken: sentryAuthToken,
              telemetry: false,
            }),
          ]
        : []),
    ],
  });

// The oxc transform picks the development JSX runtime (jsxDEV) from NODE_ENV.
// `vp run` sets it to "development" (and sometimes the string "null") before
// loading this config, so it must be assigned unconditionally: `??=` sees a
// non-nullish value and leaves the dev runtime in production bundles.
// Object.assign rather than `=`: examples/nextjs puts Next's types in the
// workspace lint program, and they declare NODE_ENV readonly.
export default defineConfig(({ command }) => {
  Object.assign(process.env, { NODE_ENV: command === 'build' ? 'production' : 'development' });
  return config(command);
});
