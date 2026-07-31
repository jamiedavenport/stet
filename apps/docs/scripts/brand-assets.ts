/**
 * Copies the brand marks into `public/`, where Blume picks up `logo.svg` for
 * the header and `favicon.svg` for the tab. Generated rather than committed so
 * `@repo/brand` stays the only place a rebrand happens.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const brand = resolve(here, '../../../internal/brand/src/assets');
const output = resolve(here, '../public');

await mkdir(output, { recursive: true });

// Blume inlines the header logo, so a currentColor mark follows the theme.
const logo = await readFile(resolve(brand, 'logo.svg'), 'utf8');
await writeFile(resolve(output, 'logo.svg'), logo.replaceAll('"black"', '"currentColor"'), 'utf8');

// The favicon is referenced as a file, where currentColor resolves to nothing.
await writeFile(
  resolve(output, 'favicon.svg'),
  await readFile(resolve(brand, 'favicon.svg'), 'utf8'),
  'utf8',
);
