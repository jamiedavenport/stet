import { readFile } from 'node:fs/promises';

import { compile } from '@tsrx/react';
import type { Plugin } from 'vite';

const TSRX = /\.tsrx$/;

/**
 * Makes `.tsrx` modules crawlable by Vite's dependency scanner.
 *
 * The scanner is a separate rolldown pass that only parses extensions it knows,
 * so without this every package imported through a `.tsrx` component is
 * discovered lazily, one page at a time, and each discovery triggers a
 * re-optimize and a reload.
 */
export function tsrxScan(): Plugin {
  const scanner: Plugin = {
    name: 'tsrx:dep-scan',
    load: {
      filter: { id: TSRX },
      async handler(id) {
        const source = await readFile(id, 'utf8');
        return { code: compile(source, id).code, moduleType: 'tsx' };
      },
    },
  };

  const optimizeDeps = {
    extensions: ['.tsrx'],
    rolldownOptions: { plugins: [scanner] },
  };

  return {
    name: 'tsrx:dep-scan-config',
    // The ssr environment inherits neither field from the top level, so both
    // scans have to be configured.
    config: () => ({ optimizeDeps, ssr: { optimizeDeps } }),
  };
}
