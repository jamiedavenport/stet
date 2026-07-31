import { generateContent } from '@stetcms/svelte';
export async function load() {
  const content = await generateContent();
  return { content };
}
