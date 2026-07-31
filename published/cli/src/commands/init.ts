import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { findStetConfig } from '@stetcms/vite/config';
import { Command } from 'commander';

import * as ui from '#/ui';

type InitOptions = {
  config?: string;
  output?: string;
  force?: boolean;
};

export type Target = {
  /** Absolute path to write. */
  path: string;
  /** An existing config, when one was found. */
  existing: string | undefined;
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
 * Decides which file to write, and reports any config already in the project.
 *
 * Detection runs through {@link findStetConfig}, the resolver `generate` and
 * `sync` settle their options against, so init cannot leave a project holding
 * two configs where only one is read.
 */
export function resolveTarget(root: string, options: InitOptions): Target {
  const existing = findStetConfig(root);

  if (options.config !== undefined) {
    const path = resolve(root, options.config);
    if (existsSync(path)) {
      return { path, existing: path };
    }
    return { path, existing: undefined };
  }

  // Overwriting means overwriting the file the project actually loads, wherever
  // it sits, rather than shadowing it with a second one at the root.
  if (existing !== undefined) {
    return { path: existing, existing };
  }

  return { path: resolve(root, 'stet.config.ts'), existing: undefined };
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

const LOCKFILES: [string, string][] = [
  ['pnpm-lock.yaml', 'pnpm add'],
  ['yarn.lock', 'yarn add'],
  ['bun.lock', 'bun add'],
  ['bun.lockb', 'bun add'],
];

/** The install command for whichever package manager the project uses. */
export function installCommand(root: string): string {
  const found = LOCKFILES.find(([lockfile]) => existsSync(resolve(root, lockfile)));
  let install = 'npm install';
  if (found !== undefined) {
    install = found[1];
  }
  return `${install} @stetcms/vite @stetcms/client`;
}

export const initCommand = new Command('init')
  .description('Write a stet.config.ts to start from')
  .option('--config <path>', 'Where to write the config (defaults to ./stet.config.ts)')
  .option('--output <path>', 'Where the generated content client should go')
  .option('--force', 'Overwrite an existing config')
  .action(async (options: InitOptions) => {
    ui.begin('stet init');

    const root = process.cwd();
    const { path, existing } = resolveTarget(root, options);

    if (existing !== undefined && options.force !== true) {
      ui.fail(`${relative(root, existing)} already exists. Pass --force to overwrite it.`);
    }

    const output = options.output ?? defaultOutput(root);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, renderStetConfig(output), 'utf8');

    const steps = ['export STET_API_KEY="..."', installCommand(root), 'npx stet generate'];
    ui.note(steps.join('\n'), 'Next');
    ui.info('Building with Vite? Add `stet()` to vite.config.ts instead of running generate.');

    ui.done(`Wrote ${relative(root, path)}`);
  });
