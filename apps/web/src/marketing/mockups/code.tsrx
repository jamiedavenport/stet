import { cn } from '@repo/ui/lib/utils';

// Code renders in the same monochrome as the rest of the interface: weight
// and contrast carry the structure, so nothing here needs a syntax palette.

export type CodeTone = 'plain' | 'muted' | 'strong';

export type CodeSegment = { text: string; tone?: CodeTone };

/** One line of a listing. An empty array is a blank line. */
export type CodeLine = CodeSegment[];

const toneClasses: Record<CodeTone, string> = {
  plain: 'text-foreground',
  muted: 'text-muted-foreground',
  strong: 'font-medium text-foreground',
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
