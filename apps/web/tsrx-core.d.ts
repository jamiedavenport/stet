// @tsrx/core points the `types` condition of ./vite/dep-scan at its .js source,
// so TypeScript reads the module as `any` under `moduleResolution: bundler`.
// The declarations it does ship are reachable, just not from that subpath.
// See "Upstream workarounds" in README.md.
declare module '@tsrx/core/vite/dep-scan' {
  import type { DepScanCompile, DepScanTransformPlugin } from '@tsrx/core/types/vite/dep-scan';

  export function createDepScanTransformPlugin(options: {
    name: string;
    filter: RegExp;
    compile: DepScanCompile;
    imports?: string[];
    moduleType?: string;
  }): DepScanTransformPlugin;
}
