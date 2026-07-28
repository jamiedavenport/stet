import { compile } from '@inlang/paraglide-js';

import { paraglideOptions } from './vite.ts';

// Run on install (the `prepare` script) so `src/paraglide` exists before any
// package typechecks or tests against it.
await compile(paraglideOptions);
