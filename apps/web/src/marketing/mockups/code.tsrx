import { cn } from '@repo/ui/lib/utils';

// A listing on the marketing site is a picture of an editor, so it is
// highlighted like one. The palette is the mockups' own and stops at this
// file; the site's own chrome stays monochrome.

export type CodeTone = 'plain' | 'muted' | 'strong' | 'keyword' | 'string' | 'type' | 'call';

export type CodeSegment = { text: string; tone?: CodeTone };

/** One line of a listing. An empty array is a blank line. */
export type CodeLine = CodeSegment[];

const toneClasses: Record<CodeTone, string> = {
  plain: 'text-foreground',
  muted: 'text-muted-foreground',
  strong: 'font-medium text-foreground',
  keyword: 'text-violet-600 dark:text-violet-400',
  string: 'text-emerald-600 dark:text-emerald-400',
  type: 'text-amber-600 dark:text-amber-400',
  call: 'text-blue-600 dark:text-blue-400',
};

function toneClass(tone: CodeTone | undefined): string {
  return toneClasses[tone ?? 'plain'];
}

/** The filename strip above a listing, as an editor tab. */
export function MockFileTab({ name }: { name: string }) @{
  <div className="flex h-9 items-center border-b border-border px-3">
    <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
      {name}
    </span>
  </div>
}

/**
 * A listing with optional line numbers. Segments carry the emphasis, so the
 * caller writes the code rather than a highlighter guessing at it.
 */
export function MockCode({
  lines,
  numbered = false,
  className,
}: {
  lines: CodeLine[];
  numbered?: boolean;
  className?: string;
}) @{
  <pre className={cn('overflow-x-auto p-4 font-mono text-xs/6', className)}>
    <code className="grid">
      @for (const line of lines; index i; key i) {
        <span className="flex">
          @if (numbered) {
            <span className="w-6 shrink-0 text-right text-muted-foreground/60 select-none">
              {i + 1}
            </span>
          }
          <span className={numbered ? 'pl-4 whitespace-pre' : 'whitespace-pre'}>
            @for (const segment of line; index j; key j) {
              <span className={toneClass(segment.tone)}>{segment.text}</span>
            }
            @if (line.length === 0) {
              <span> </span>
            }
          </span>
        </span>
      }
    </code>
  </pre>
}
