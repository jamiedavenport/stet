// Fallback for tooling that doesn't load the TSRX TypeScript plugin (e.g. `vp
// check`). Tools that do load it resolve the real module, which wins over this
// wildcard declaration.
declare module '*.tsrx';
