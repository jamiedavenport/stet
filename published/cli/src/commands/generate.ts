import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DEFAULT_ORIGIN, fetchContentModel, renderContentModule } from '@stetcms/client/codegen';
import { Command } from 'commander';

import * as ui from '#/ui';

export const generateCommand = new Command('generate')
  .description('Generate the typed content client from your content model')
  .option('--url <origin>', 'Stet server origin (defaults to $STET_ORIGIN or the hosted app)')
  .option('--key <api-key>', 'Organization API key (defaults to $STET_API_KEY)')
  .option('--output <path>', 'Where the generated module goes', 'src/stet.gen.ts')
  .action(async (options: { url?: string; key?: string; output: string }) => {
    // The same resolution as @stetcms/vite, so the two tools configure alike.
    const origin = options.url ?? process.env.STET_ORIGIN ?? DEFAULT_ORIGIN;
    const apiKey = options.key ?? process.env.STET_API_KEY;

    ui.begin('stet generate');

    if (apiKey === undefined || apiKey === '') {
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

    const output = resolve(process.cwd(), options.output);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, code, 'utf8');

    ui.done(`Generated ${options.output}`);
  });
