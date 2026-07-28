import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

// Grammars are registered one by one rather than through lowlight's `common`
// bundle: `common` pulls in ~37 languages and roughly doubles the notes route
// chunk, which the client budget in package.json does not have room for.
export const lowlight = createLowlight();

lowlight.register({ bash, css, go, json, markdown, python, rust, sql, typescript, xml, yaml });

/** Languages offered in the code block language picker, in menu order. */
export const codeLanguages = [
  { label: 'Plain text', value: 'plaintext' },
  { label: 'Bash', value: 'bash' },
  { label: 'CSS', value: 'css' },
  { label: 'Go', value: 'go' },
  { label: 'HTML', value: 'xml' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'YAML', value: 'yaml' },
] as const;
