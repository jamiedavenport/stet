import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const clientDirectory = resolve(import.meta.dirname, '../dist/client');
const blogDirectory = resolve(clientDirectory, 'blog');
const blogIndex = resolve(blogDirectory, 'index.html');

const indexHtml = await readFile(blogIndex, 'utf8');
if (!indexHtml.includes('Notes from the build')) {
  throw new Error('The prerendered blog index does not contain its expected heading.');
}

const entries = await readdir(blogDirectory, { withFileTypes: true });
const postDirectories = entries.filter((entry) => entry.isDirectory());
if (postDirectories.length === 0) {
  throw new Error('The prerendered blog contains no post pages.');
}

for (const entry of postDirectories) {
  await readFile(resolve(blogDirectory, entry.name, 'index.html'), 'utf8');
}
