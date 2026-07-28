import type { Plugin } from 'vite';
import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import type { GenerateContext } from './index';
import { stet } from './index';

const entryId = 'entry.js';

function entryPlugin(code: string, onLoad?: () => void): Plugin {
  return {
    name: 'test-entry',
    resolveId(id) {
      if (id === entryId) {
        return id;
      }
    },
    load(id) {
      if (id === entryId) {
        if (onLoad !== undefined) {
          onLoad();
        }
        return code;
      }
    },
  };
}

async function buildWith(plugins: Plugin[]): Promise<string> {
  const result = await build({
    root: process.cwd(),
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: entryId },
    },
    plugins,
  });

  if (!('output' in result)) {
    throw new Error('expected a single build output');
  }

  return result.output[0].code;
}

describe('stet', () => {
  it('exposes config through the virtual:stet module', async () => {
    const code = await buildWith([
      entryPlugin(`import config from 'virtual:stet';\nconsole.log(config);`),
      stet({ config: { origin: 'https://stet.example.com', channel: 'stable' } }),
    ]);

    expect(code).toContain('https://stet.example.com');
    expect(code).toContain('stable');
  });

  it('resolves the virtual module with no options', async () => {
    const code = await buildWith([
      entryPlugin(`import config from 'virtual:stet';\nconsole.log(config);`),
      stet(),
    ]);

    expect(code.length).toBeGreaterThan(0);
  });

  it('awaits the generate hook before loading modules', async () => {
    const sequence: string[] = [];
    const contexts: GenerateContext[] = [];

    await buildWith([
      entryPlugin(`console.log('entry');`, () => {
        sequence.push('load');
      }),
      stet({
        generate: async (context) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 10);
          });
          sequence.push('generate');
          contexts.push(context);
        },
      }),
    ]);

    expect(sequence[0]).toBe('generate');
    expect(sequence).toContain('load');
    expect(contexts).toEqual([{ root: process.cwd(), command: 'build', mode: 'production' }]);
  });
});
