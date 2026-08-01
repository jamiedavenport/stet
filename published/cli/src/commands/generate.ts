import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fetchContentModel, renderContentModule } from '@stetcms/client/codegen';
import { Command } from 'commander';

import { settleOptions } from '#/config';
import type { CommandOptions } from '#/config';
import * as ui from '#/ui';

export type GenerateOptions = CommandOptions & {
  ifKey?: boolean;
};

/** The command's whole body, extracted so tests can drive it without a process. */
export async function runGenerate(options: GenerateOptions): Promise<void> {
  const { origin, apiKey, output } = await settleOptions(options);
  if (apiKey === undefined) {
    if (options.ifKey === true) {
      // Mirrors @stetcms/vite, which never fails a keyless build: a checkout
      // without STET_API_KEY builds against the committed generated client.
      // Only the missing key is forgiven; with a key, a failed fetch is real.
      ui.done('No API key set; kept the generated client already on disk.');
      return;
    }
    ui.fail('No API key. Pass --key or set STET_API_KEY.');
  }

  const fetching = ui.progress();
  fetching.start(`Fetching the content model from ${origin}…`);
  let code: string;
  try {
    const model = await fetchContentModel(origin, apiKey);
    const count = model.types.length;
    code = renderContentModule(model, origin);
    fetching.stop(`Fetched ${count} ${count === 1 ? 'type' : 'types'}`);
  } catch (error) {
    fetching.stop('Could not fetch the model');
    ui.fail(String(error));
  }

  const target = resolve(process.cwd(), output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, code, 'utf8');

  ui.done(`Generated ${output}`);
}

export const generateCommand = new Command('generate')
  .description('Generate the typed content client from your content model')
  .option('--url <origin>', 'Stet server origin (defaults to $STET_ORIGIN or the hosted app)')
  .option('--key <api-key>', 'Organization API key (defaults to $STET_API_KEY)')
  .option('--output <path>', 'Where the generated module goes')
  .option('--config <path>', 'Path to stet.config.ts (auto-detected by default)')
  .option('--if-key', 'Succeed without generating when no API key is set')
  .action(async (options: GenerateOptions) => {
    ui.begin('stet generate');
    await runGenerate(options);
  });
