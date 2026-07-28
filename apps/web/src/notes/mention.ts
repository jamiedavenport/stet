import Mention from '@tiptap/extension-mention';

import { suggestionPopup } from '#/notes/suggestion-popup';
import type { SuggestionItem } from '#/notes/suggestion';

export type MentionMember = {
  id: string;
  name: string;
  email: string;
};

export type MentionOptions = {
  /**
   * Read through a ref rather than captured directly: the roster resolves
   * after the editor is created, and re-creating the editor would drop the
   * collaborative binding.
   */
  getMembers: () => MentionMember[];
  onMention: (member: MentionMember) => void;
};

export function mentionExtension({ getMembers, onMention }: MentionOptions) {
  return Mention.configure({
    // The stored id is what a future @-aware feature would resolve against,
    // so keep it the user id and let the label carry the display name.
    HTMLAttributes: { class: 'mention' },
    suggestion: {
      char: '@',
      items: ({ query }): SuggestionItem[] => {
        const needle = query.toLowerCase();
        return getMembers()
          .filter(
            (member) =>
              member.name.toLowerCase().includes(needle) ||
              member.email.toLowerCase().includes(needle),
          )
          .slice(0, 8)
          .map((member) => ({ id: member.id, label: member.name, hint: member.email }));
      },
      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: 'mention', attrs: { id: props.id, label: props.label } },
            { type: 'text', text: ' ' },
          ])
          .run();

        const member = getMembers().find((candidate) => candidate.id === props.id);
        if (member !== undefined) {
          onMention(member);
        }
      },
      render: suggestionPopup(),
    },
  });
}
