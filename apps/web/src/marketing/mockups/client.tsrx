import { TextAaIcon, CalendarBlankIcon, CaretCircleDownIcon, UserIcon, TextAlignLeftIcon, WarningIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@repo/ui/lib/utils';

import { MockCode, MockFileTab } from '#/marketing/mockups/code.tsrx';
import type { CodeLine } from '#/marketing/mockups/code.tsrx';
import { MockPanel } from '#/marketing/mockups/frame.tsrx';
import { fieldTones } from '#/marketing/mockups/palette';
import type { FieldTone } from '#/marketing/mockups/palette';

// The columns from the collection mockup, arriving in the editor as
// properties. Keep the two in step: the payoff is that they match.

type Completion = { icon: Icon; name: string; type: string; tone: FieldTone };

const completions: Completion[] = [
  { icon: TextAaIcon, name: 'title', type: 'string', tone: 'text' },
  {
    icon: CaretCircleDownIcon,
    name: 'status',
    type: "'draft' | 'inReview' | 'live'",
    tone: 'choice',
  },
  { icon: UserIcon, name: 'author', type: 'Person', tone: 'relation' },
  { icon: CalendarBlankIcon, name: 'publishedAt', type: 'string | null', tone: 'value' },
  { icon: TextAlignLeftIcon, name: 'body', type: 'string', tone: 'text' },
];

const usageLines: CodeLine[] = [
  [
    { text: 'import', tone: 'keyword' },
    { text: ' { stet } ' },
    { text: 'from', tone: 'keyword' },
    { text: " '@stetcms/client'", tone: 'string' },
    { text: ';', tone: 'muted' },
  ],
  [],
  [
    { text: 'const', tone: 'keyword' },
    { text: ' post = ' },
    { text: 'await', tone: 'keyword' },
    { text: ' stet.posts.' },
    { text: 'get', tone: 'call' },
    { text: '(' },
    { text: "'hello-world'", tone: 'string' },
    { text: ');', tone: 'muted' },
  ],
  [],
  [{ text: 'post.', tone: 'plain' }],
];

const deprecationLines: CodeLine[] = [
  [
    { text: 'export type ', tone: 'keyword' },
    { text: 'Post', tone: 'type' },
    { text: ' = {' },
  ],
  [{ text: '  title: ' }, { text: 'string', tone: 'type' }, { text: ';' }],
  [
    { text: '  status: ' },
    { text: "'draft' | 'inReview' | 'live'", tone: 'string' },
    { text: ';' },
  ],
  [],
  [{ text: '  /**', tone: 'muted' }],
  [
    { text: '   * @deprecated', tone: 'call' },
    { text: ' Removed from the model on', tone: 'muted' },
  ],
  [{ text: '   * 12 June 2026. Still served; reads', tone: 'muted' }],
  [{ text: '   * the last value it held.', tone: 'muted' }],
  [{ text: '   */', tone: 'muted' }],
  [
    { text: '  subtitle: ' },
    { text: 'string', tone: 'type' },
    { text: ';' },
  ],
  [{ text: '};' }],
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
          <completion.icon className={cn('size-3.5 shrink-0', fieldTones[completion.tone])} />
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
    <div className="flex items-start gap-2.5 border-t border-border bg-emerald-500/8 px-4 py-3">
      <WarningIcon className="size-4 h-lh shrink-0 text-emerald-600 dark:text-emerald-400" />
      <p className="text-sm text-pretty text-muted-foreground">
        Marketing removed <span className="font-mono">subtitle</span> an hour ago. Your build is
        green; migrate when it suits you.
      </p>
    </div>
  </MockPanel>
}
