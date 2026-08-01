import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { findStetConfig } from '@stetcms/vite/config';
import { Command } from 'commander';
import { resolveCommand } from 'package-manager-detector/commands';
import { detect } from 'package-manager-detector/detect';

import * as ui from '#/ui';

type InitOptions = {
  config?: string;
  output?: string;
  force?: boolean;
};

/** Where {@link resolveTarget} decided to write, and what it found already there. */
export type Target = {
  /** Absolute path to write. */
  path: string;
  /** A config already at {@link Target.path}, which only `--force` replaces. */
  existing: string | undefined;
  /** The config the project loads today, wherever in the project it sits. */
  detected: string | undefined;
};

/**
 * The default `output`, which is where a developer would have put it anyway:
 * projects with a `src/` keep generated code inside it, and flatter ones do
 * not have the directory to write into.
 */
export function defaultOutput(root: string): string {
  if (existsSync(resolve(root, 'src'))) {
    return 'src/stet.gen.ts';
  }
  return 'stet.gen.ts';
}

/**
 * Decides which file to write, and reports what the project already has.
 *
 * Detection runs through {@link findStetConfig}, the resolver `generate` and
 * `sync` settle their options against, so writing to the default location can
 * never shadow the config the project loads. An explicit `--config` is honoured
 * as given and can land somewhere that resolver will not look, which is why
 * `detected` is reported separately for the caller to warn about.
 */
export function resolveTarget(root: string, options: InitOptions): Target {
  const detected = findStetConfig(root);

  if (options.config !== undefined) {
    const path = resolve(root, options.config);
    if (existsSync(path)) {
      return { path, existing: path, detected };
    }
    return { path, existing: undefined, detected };
  }

  // Overwriting means overwriting the file the project actually loads, wherever
  // it sits, rather than shadowing it with a second one at the root.
  if (detected !== undefined) {
    return { path: detected, existing: detected, detected };
  }

  return { path: resolve(root, 'stet.config.ts'), existing: undefined, detected };
}

/** The `stet.config.ts` init writes. */
export function renderStetConfig(output: string): string {
  return `import { defineStet } from '@stetcms/config';
// import { defineAnalytics, event } from '@stetcms/analytics';
// import { z } from 'zod';

export default defineStet({
  output: '${output}',

  // A typed tracking plan, published with \`stet sync\`.
  // analytics: defineAnalytics({
  //   events: { signup: event({ plan: z.enum(['free', 'paid']) }) },
  // }),
});
`;
}

const VITE_CONFIGS = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.mts',
  'vite.config.cjs',
];

/**
 * Whether the plugin is any use here. Next.js, Astro's own config, and a bare
 * CI checkout all run codegen through `stet generate` instead, so telling them
 * to install `@stetcms/vite` would be telling them to install nothing.
 */
export function usesVite(root: string): boolean {
  if (VITE_CONFIGS.some((candidate) => existsSync(resolve(root, candidate)))) {
    return true;
  }
  const manifest = resolve(root, 'package.json');
  if (!existsSync(manifest)) {
    return false;
  }
  const { dependencies, devDependencies } = JSON.parse(readFileSync(manifest, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return 'vite' in { ...dependencies, ...devDependencies };
}

/**
 * The install line for whichever package manager the project uses, resolved by
 * `package-manager-detector`: it reads the `packageManager` field and walks up
 * to the workspace root, so a package inside a monorepo is told the truth.
 */
export async function installCommand(root: string, packages: string[]): Promise<string> {
  const detected = await detect({ cwd: root });
  const agent = detected?.agent ?? 'npm';
  const resolved = resolveCommand(agent, 'add', packages);
  if (resolved === null) {
    return `npm install ${packages.join(' ')}`;
  }
  return `${resolved.command} ${resolved.args.join(' ')}`;
}

/**
 * What to do once the config exists. `@stetcms/client` is what the generated
 * module imports and so is always needed; the plugin only earns its place in a
 * project that builds with Vite, and codegen without one is `stet generate`.
 */
export async function nextSteps(root: string): Promise<string> {
  const key = 'export STET_API_KEY="..."';
  if (usesVite(root)) {
    const install = await installCommand(root, ['@stetcms/vite', '@stetcms/client']);
    return [key, install, 'Add stet() to vite.config.ts'].join('\n');
  }
  const install = await installCommand(root, ['@stetcms/client']);
  return [key, install, 'npx stet generate'].join('\n');
}

/** The command's whole body, taking the project root so tests need no `chdir`. */
export async function runInit(root: string, options: InitOptions): Promise<void> {
  const { path, existing, detected } = resolveTarget(root, options);

  if (existing !== undefined && options.force !== true) {
    ui.fail(`${relative(root, existing)} already exists. Pass --force to overwrite it.`);
  }

  const output = options.output ?? defaultOutput(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderStetConfig(output), 'utf8');

  if (detected !== undefined && detected !== path) {
    ui.warn(
      `${relative(root, detected)} is the config Stet loads. Pass --config to point the CLI and the plugin at ${relative(root, path)}, or this file goes unread.`,
    );
  }

  ui.note(await nextSteps(root), 'Next');
  ui.done(`Wrote ${relative(root, path)}`);
}

export const initCommand = new Command('init')
  .description('Write a stet.config.ts to start from')
  .option('--config <path>', 'Where to write the config (defaults to ./stet.config.ts)')
  .option('--output <path>', 'Where the generated content client should go')
  .option('--force', 'Overwrite an existing config')
  .action(async (options: InitOptions) => {
    ui.begin('stet init');
    await runInit(process.cwd(), options);
  });
