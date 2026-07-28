// Fallback for tooling that doesn't load the TSRX plugin (e.g. `vp check`);
// the plugin resolves the real module and overrides this when loaded.
declare module '*.tsrx';
