#!/usr/bin/env node
// The CLI itself is bundled into dist/ by `vp pack` and ships in the npm
// package. This launcher is committed because pnpm links a bin only when its
// target exists at install time: in the monorepo dist/ is gitignored and
// built after install, so pointing the bin straight at it would leave every
// fresh checkout without a `stet` command.
import { access } from 'node:fs/promises';

const entry = new URL('../dist/index.mjs', import.meta.url);

try {
  await access(entry);
} catch {
  console.error('stet: the CLI is not built yet. Run `vp run cli#build` from the repository root.');
  process.exit(1);
}

await import(entry.href);
