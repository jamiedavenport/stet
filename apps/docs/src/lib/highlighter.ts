import { createShikiFactory } from 'fumadocs-core/highlight/shiki';

/**
 * Themes used for code blocks, in both the MDX content and the API reference.
 * Matches Fumadocs' defaults so the styling is unchanged.
 */
export const shikiThemes = { light: 'github-light', dark: 'github-dark' } as const;

/**
 * A fine-grained Shiki highlighter instead of the `shiki` bundle entry.
 *
 * The bundle entry links every grammar and theme as a lazy chunk, which grew
 * the Worker to 455 modules and 25 MiB, more than `wrangler deploy` could
 * attach. Add languages here as the docs need them; anything unlisted falls
 * back to plain text.
 */
export const shikiFactory = createShikiFactory({
  async init() {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);

    const core = await createHighlighterCore({
      themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
      langs: [
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/mdx.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    });

    // Fumadocs asks for languages by name, which only a bundled highlighter
    // can resolve; a core one takes the string for a grammar and throws on
    // its missing `scopeName`. Everything supported is loaded above, so a
    // request by name is already satisfied.
    return Object.assign(core, {
      async loadLanguage(...langs: Parameters<typeof core.loadLanguage>) {
        const grammars = langs.filter((lang) => typeof lang !== 'string');
        if (grammars.length > 0) await core.loadLanguage(...grammars);
      },
    });
  },
});
