import { TextAaIcon, CalendarBlankIcon, CaretCircleDownIcon, UserIcon, TextAlignLeftIcon, WarningIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@repo/ui/lib/utils';

import { MockCode, MockFileTab } from '#/marketing/mockups/code.tsrx';
import type { CodeLine } from '#/marketing/mockups/code.tsrx';
import { MockPanel } from '#/marketing/mockups/frame.tsrx';

// The columns from the collection mockup, arriving in the editor as
// properties. Keep the two in step: the payoff is that they match.

type Completion = { icon: Icon; name: string; type: string };

const completions: Completion[] = [
  { icon: TextAaIcon, name: 'title', type: 'string' },
  { icon: CaretCircleDownIcon, name: 'status', type: "'draft' | 'inReview' | 'live'" },
  { icon: UserIcon, name: 'author', type: 'Person' },
  { icon: CalendarBlankIcon, name: 'publishedAt', type: 'string | null' },
  { icon: TextAlignLeftIcon, name: 'body', type: 'string' },
];

const usageLines: CodeLine[] = [
  [
    { text: 'import', tone: 'strong' },
    { text: ' { stet } ' },
    { text: 'from', tone: 'strong' },
    { text: " '@stetcms/client'" },
    { text: ';', tone: 'muted' },
  ],
  [],
  [
    { text: 'const', tone: 'strong' },
    { text: ' post = ' },
    { text: 'await', tone: 'strong' },
    { text: ' stet.posts.get(' },
    { text: "'hello-world'" },
    { text: ');', tone: 'muted' },
  ],
  [],
  [{ text: 'post.', tone: 'plain' }],
];

const deprecationLines: CodeLine[] = [
  [{ text: 'export type Post = {', tone: 'muted' }],
  [{ text: '  title: string;' }],
  [{ text: '  status: ' }, { text: "'draft' | 'inReview' | 'live'" }, { text: ';' }],
  [],
  [{ text: '  /**', tone: 'muted' }],
  [{ text: '   * @deprecated', tone: 'strong' }, { text: ' Removed from the model on', tone: 'muted' }],
  [{ text: '   * 12 June 2026. Still served; reads', tone: 'muted' }],
  [{ text: '   * the last value it held.', tone: 'muted' }],
  [{ text: '   */', tone: 'muted' }],
  [{ text: '  subtitle: string;' }],
  [{ text: '};', tone: 'muted' }],
];

/**
 * The generated client under the cursor: the fields marketing added to the
 * collection are the properties the editor offers, typed and documented.
 */
export function ClientMockup() @{
  <MockPanel className="p-0">
    <MockFileTab name="app/routes/post.tsx" />
    <MockCode lines={usageLines} numbered className="pb-0" />
    {/* Indented to sit under the caret at the end of the last line, the way a
        completion list drops out of the cursor rather than over the file. */}
    <div className="mr-4 mb-4 ml-14 max-w-80 overflow-hidden rounded-lg bg-popover shadow-lg ring-1 ring-foreground/10 dark:shadow-none">
      @for (const completion of completions; index i; key completion.name) {
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 font-mono text-xs',
            i === 0 ? 'bg-accent' : undefined,
          )}
        >
          <completion.icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="shrink-0">{completion.name}</span>
          <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">
            {completion.type}
          </span>
        </div>
      }
    </div>
  </MockPanel>
}

/**
 * What a deleted field looks like downstream: a deprecation in the generated
 * types, never a red build.
 */
export function DeprecationMockup() @{
  <MockPanel className="p-0">
    <MockFileTab name="src/stet.gen.ts" />
    <MockCode lines={deprecationLines} />
    <div className="flex items-start gap-2.5 border-t border-border px-4 py-3">
      <WarningIcon className="size-4 shrink-0 text-muted-foreground" />
      <p className="text-sm text-pretty text-muted-foreground">
        Marketing removed <span className="font-mono">subtitle</span> an hour ago. Your build is
        green; migrate when it suits you.
      </p>
    </div>
  </MockPanel>
}
