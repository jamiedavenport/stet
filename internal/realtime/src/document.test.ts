import { schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { Doc, XmlElement, XmlText } from 'yjs';

import { loadDocument, loadDocumentState, parseRoomName, saveDocument } from './document';

let db: StetDatabase;
const room = { organizationId: 'org-1', page: '/app/notes' };

beforeEach(async () => {
  const sqlite = new Sqlite(':memory:');
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(schema),
  );
  for (const statement of statements) {
    sqlite.exec(statement);
  }
  db = drizzle(sqlite, { schema }) as unknown as StetDatabase;
  setDatabase(db);
  await db.insert(schema.organization).values({
    id: room.organizationId,
    name: 'Org One',
    slug: 'org-one',
    createdAt: new Date(),
  });
});

describe('parseRoomName', () => {
  it('splits on the first colon so pages keep their own punctuation', () => {
    expect(parseRoomName('org-1:/app/notes')).toEqual(room);
    expect(parseRoomName('org-1:/app/notes:draft')).toEqual({
      organizationId: 'org-1',
      page: '/app/notes:draft',
    });
  });

  it('rejects names that are not a room', () => {
    expect(parseRoomName('org-1')).toBeNull();
    expect(parseRoomName('org-1:')).toBeNull();
    expect(parseRoomName(':/app/notes')).toBeNull();
  });
});

describe('a saved document', () => {
  it('rehydrates into a doc the live accessors still read', async () => {
    // The two roots the app binds: a task map and the editor's fragment.
    const doc = new Doc();
    doc.getMap('tasks').set('task-1', { title: 'Ship it', done: false });
    const paragraph = new XmlElement('paragraph');
    paragraph.insert(0, [new XmlText('A shared note.')]);
    doc.getXmlFragment('notes').insert(0, [paragraph]);

    await saveDocument(room, doc);
    const restored = await loadDocument(room);

    expect(restored).not.toBeNull();
    expect(restored?.doc.getMap('tasks').get('task-1')).toEqual({ title: 'Ship it', done: false });
    expect(restored?.doc.getXmlFragment('notes').toJSON()).toBe(
      '<paragraph>A shared note.</paragraph>',
    );
  });

  it('replaces the room’s previous state rather than accumulating rows', async () => {
    const doc = new Doc();
    const tasks = doc.getMap<string>('tasks');

    tasks.set('task-1', 'first');
    await saveDocument(room, doc);
    tasks.set('task-1', 'second');
    await saveDocument(room, doc);

    expect(await db.$count(schema.document)).toBe(1);
    const restored = await loadDocument(room);
    expect(restored?.doc.getMap('tasks').get('task-1')).toBe('second');
  });

  it('is scoped to one organization and page', async () => {
    const doc = new Doc();
    doc.getMap<string>('tasks').set('task-1', 'ours');
    await saveDocument(room, doc);

    expect(await loadDocument({ ...room, organizationId: 'org-2' })).toBeNull();
    expect(await loadDocument({ ...room, page: '/app/tasks' })).toBeNull();
  });

  it('records when it was written', async () => {
    const doc = new Doc();
    doc.getMap<string>('tasks').set('task-1', 'ours');

    const before = Date.now();
    await saveDocument(room, doc);

    const saved = await loadDocumentState(room);
    expect(saved?.updatedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});

describe('an unsaved room', () => {
  it('reads as null rather than an empty document', async () => {
    expect(await loadDocument(room)).toBeNull();
    expect(await loadDocumentState(room)).toBeNull();
  });
});

describe('a document over the row limit', () => {
  it('names the room it came from', async () => {
    const doc = new Doc();
    doc.getText('notes').insert(0, 'x'.repeat(1_600_000));

    await expect(saveDocument(room, doc)).rejects.toThrow('org-1:/app/notes');
    expect(await db.$count(schema.document)).toBe(0);
  });
});
