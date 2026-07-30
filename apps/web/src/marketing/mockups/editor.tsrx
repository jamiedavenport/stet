import {
  ChatCircleIcon,
  CodeIcon,
  LinkIcon,
  ListBulletsIcon,
  TextBIcon,
  TextHOneIcon,
  TextItalicIcon,
  QuotesIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { MockCrumbs, MockShell } from '#/marketing/mockups/frame.tsrx';

// The body editor on its own page, which is where rich text always edits.
// Two people are in the document: one has a caret in the third paragraph,
// the other has left a comment against a sentence in the second.

const tools: Icon[] = [
  TextHOneIcon,
  TextBIcon,
  TextItalicIcon,
  LinkIcon,
  ListBulletsIcon,
  QuotesIcon,
  CodeIcon,
];

function Toolbar() @{
  <div className="flex h-11 items-center gap-0.5 border-b border-border px-4">
    @for (const Tool of tools; index i; key i) {
      <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
        <Tool className="size-4" />
      </span>
    }
    <span className="ml-auto flex items-center -space-x-1.5">
      <span className="flex size-6 items-center justify-center rounded-full bg-chart-1 text-[0.625rem] font-medium text-white ring-2 ring-background">
        AO
      </span>
      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium ring-2 ring-background">
        RS
      </span>
    </span>
  </div>
}

/** A comment anchored to the sentence it is about, in the margin beside it. */
function CommentCard() @{
  <div className="w-56 shrink-0 rounded-lg bg-card p-3 ring-1 ring-foreground/10 @max-3xl:hidden">
    <div className="flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium">
        MH
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">Mira</p>
      <ChatCircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </div>
    <p className="mt-2 text-sm text-pretty text-muted-foreground">
      Can we name the two teams here? It reads abstract otherwise.
    </p>
  </div>
}

/**
 * The rich text editor: a full page for the body, written together, with
 * discussion attached to the sentence rather than filed somewhere else.
 */
export function EditorMockup() @{
  <MockShell>
    <MockCrumbs trail={['Posts', 'Both teams at full speed', 'Body']} />
    <Toolbar />
    <div className="flex flex-1 gap-6 p-6">
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold tracking-tight">Both teams at full speed</p>
        <p className="mt-4 text-sm/7 text-pretty">
          Every CMS makes one side compromise. Developer-first tools bury content teams in JSON and
          Git; marketer-first tools hand engineers an untyped API and a prayer.
        </p>
        <p className="mt-3 text-sm/7 text-pretty">
          <span className="bg-chart-1/15">
            The gap between the two teams is where the work actually goes missing.
          </span>{' '}
          Closing it is the whole job.
        </p>
        <p className="relative mt-3 text-sm/7 text-pretty">
          Marketing owns the model. Engineering gets a contract generated from it.
          <span className="relative inline-block w-0.5 align-text-bottom">
            <span className="absolute -top-0.5 bottom-0 w-0.5 bg-chart-1" />
            <span className="absolute -top-5 left-0 rounded-sm bg-chart-1 px-1 py-0.5 text-[0.625rem] font-medium whitespace-nowrap text-white">
              Ade
            </span>
          </span>
        </p>
      </div>
      <CommentCard />
    </div>
  </MockShell>
}
