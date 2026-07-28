'use client';

import { cn } from '../../lib/utils';
import { type HTMLAttributes, useEffect, useRef, useState } from 'react';
import { createHighlighterCore, type HighlighterCore, type ShikiTransformer } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { BundledLanguage } from 'shiki/langs';

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

const lineNumberTransformer: ShikiTransformer = {
  name: 'line-numbers',
  line(node, line) {
    node.children.unshift({
      type: 'element',
      tagName: 'span',
      properties: {
        className: [
          'inline-block',
          'min-w-10',
          'mr-4',
          'text-right',
          'select-none',
          'text-muted-foreground',
        ],
      },
      children: [{ type: 'text', value: String(line) }],
    });
  },
};

// A fine-grained highlighter instead of the `shiki` bundle entry: the full
// registry adds ~1.8 MB gzip of lazy grammar chunks to every build that
// imports this file. Add languages here as the app needs them.
let highlighterPromise: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('shiki/themes/one-light.mjs'), import('shiki/themes/one-dark-pro.mjs')],
    langs: [import('shiki/langs/json.mjs')],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

async function highlightCode(code: string, language: BundledLanguage, showLineNumbers = false) {
  const transformers: ShikiTransformer[] = showLineNumbers ? [lineNumberTransformer] : [];
  const highlighter = await getHighlighter();
  const lang = highlighter.getLoadedLanguages().includes(language) ? language : 'text';

  return [
    highlighter.codeToHtml(code, {
      lang,
      theme: 'one-light',
      transformers,
    }),
    highlighter.codeToHtml(code, {
      lang,
      theme: 'one-dark-pro',
      transformers,
    }),
  ];
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>('');
  const [darkHtml, setDarkHtml] = useState<string>('');
  const mounted = useRef(false);

  useEffect(() => {
    void highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  return (
    <div
      className={cn(
        'group relative w-full overflow-hidden rounded-md border bg-background text-foreground',
        className,
      )}
      {...props}
    >
      <div className="relative">
        <div
          className="overflow-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div
          className="hidden overflow-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
          dangerouslySetInnerHTML={{ __html: darkHtml }}
        />
        {children && (
          <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
};
