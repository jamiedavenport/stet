import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import type { Editor } from '@tiptap/react';

import { codeLanguages } from '#/notes/highlight';

const languageItems = Object.fromEntries(
  codeLanguages.map((language) => [language.value, language.label]),
);

/**
 * Sets the grammar of the code block the cursor is in. Without it the language
 * could only be chosen by typing the ```lang input rule when the block is
 * first created.
 */
export function LanguagePicker({ editor }: { editor: Editor }) @{
  const current = editor.getAttributes('codeBlock').language;

  <Select
    items={languageItems}
    value={typeof current === 'string' ? current : 'plaintext'}
    onValueChange={(value) => {
      if (value !== null) {
        editor.chain().focus().updateAttributes('codeBlock', { language: value }).run();
      }
    }}
  >
    <SelectTrigger className="h-7 w-36 text-xs" aria-label={"Code language"}>
      <SelectValue />
    </SelectTrigger>
    <SelectPositioner>
      <SelectContent>
        @for (const language of codeLanguages; key language.value) {
          <SelectItem value={language.value}>{language.label}</SelectItem>
        }
      </SelectContent>
    </SelectPositioner>
  </Select>
}
