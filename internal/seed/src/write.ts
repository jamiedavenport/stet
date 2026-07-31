import { setBodyMarkdown } from '@repo/content/body';
import { valuesText } from '@repo/content/schema';
import type { EntryValues } from '@repo/content/schema';
import { schema } from '@repo/db';
import { seedContent } from '@repo/db/seed-data';
import { documentBodyText, entryPage } from '@repo/realtime/entry';
import { Doc, encodeStateAsUpdate } from 'yjs';

import type { Db } from './db';
import { landingFields, postFields } from './model';
import type { SeedField } from './model';
import { body, landing, posts } from './posts';
import { writeRevisions } from './revisions';

// Writes the demo workspace. Rich text bodies are not columns: each lives in
// the entry's realtime room (see @repo/realtime), so they are built here as
// Yjs documents and stored as that room's state, which is what the editor
// opens and what the public API renders back to markdown.

const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;

const entryId = (slug: string) => `seed-entry-${slug}`;

/** A date field holds a calendar day with no time and no zone. */
function dayValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** An entry's document, with `markdown` written into one rich text field. */
function documentWithBody(fieldKey: string, markdown: string): Doc {
  const doc = new Doc();
  setBodyMarkdown(doc, fieldKey, markdown);
  return doc;
}

export function writeDemoWorkspace(db: Db, organizationId: string, now: Date): void {
  writeModel(db, organizationId, now);
  for (const post of posts) {
    writePost(db, organizationId, post, now);
  }
  writeLanding(db, organizationId, now);
}

function writeModel(db: Db, organizationId: string, now: Date): void {
  db.insert(schema.contentType)
    .values([
      {
        id: seedContent.posts.id,
        organizationId,
        slug: seedContent.posts.slug,
        name: seedContent.posts.name,
        kind: 'collection',
        createdAt: now,
      },
      {
        id: seedContent.landing.id,
        organizationId,
        slug: seedContent.landing.slug,
        name: seedContent.landing.name,
        kind: 'map',
        // After posts, so the model (and the client generated from it) keeps a
        // stable order across reseeds.
        createdAt: new Date(now.getTime() + 1000),
      },
    ])
    .run();

  const rows = [
    ...fieldRows(seedContent.posts.id, postFields, now),
    ...fieldRows(seedContent.landing.id, landingFields, now),
  ];
  db.insert(schema.contentField).values(rows).run();
}

function fieldRows(typeId: string, fields: SeedField[], now: Date) {
  return fields.map((field, position) => ({
    id: field.id,
    typeId,
    key: field.key,
    name: field.name,
    type: field.type,
    config: JSON.stringify(field.config ?? {}),
    position,
    createdAt: now,
  }));
}

function writePost(db: Db, organizationId: string, post: (typeof posts)[number], now: Date): void {
  const publishedAt = new Date(now.getTime() - post.daysAgo * day);
  const updatedAt = new Date(publishedAt.getTime() + 2 * hour);
  const id = entryId(post.slug);
  const values: EntryValues = {
    summary: post.summary,
    author: post.authorId,
    cover: post.coverId,
    topic: post.topicId,
    tags: post.tagIds,
    published: dayValue(publishedAt),
    featured: post.featured,
    related: post.related.map(entryId),
  };
  const markdown = body(post.slug);
  const doc = documentWithBody('body', markdown);

  db.insert(schema.contentEntry)
    .values({
      id,
      typeId: seedContent.posts.id,
      organizationId,
      slug: post.slug,
      title: post.title,
      values: JSON.stringify(values),
      fieldText: valuesText(values),
      bodyText: documentBodyText(doc),
      createdAt: publishedAt,
      updatedAt,
    })
    .run();
  writeDocument(db, organizationId, id, doc, updatedAt);

  // Two versions each, so history has something to show and something to
  // restore to: the entry as it was before anyone filled the metadata in, and
  // the entry as it stands.
  const draft = markdown.split('\n## ')[0].trimEnd();
  writeRevisions(db, organizationId, id, [
    {
      suffix: 'draft',
      title: post.title,
      slug: post.slug,
      values: { author: post.authorId, topic: post.topicId },
      bodies: { body: draft },
      authorId: post.authorId,
      via: 'editor',
      createdAt: new Date(publishedAt.getTime() - day),
    },
    {
      suffix: 'published',
      title: post.title,
      slug: post.slug,
      values,
      bodies: { body: markdown },
      authorId: post.authorId,
      via: 'app',
      createdAt: updatedAt,
    },
  ]);
}

function writeLanding(db: Db, organizationId: string, now: Date): void {
  const id = 'seed-entry-landing';
  const values: EntryValues = { headline: landing.headline };
  const markdown = body(landing.pitch);
  const doc = documentWithBody('pitch', markdown);

  db.insert(schema.contentEntry)
    .values({
      id,
      typeId: seedContent.landing.id,
      organizationId,
      slug: 'default',
      title: seedContent.landing.name,
      values: JSON.stringify(values),
      fieldText: valuesText(values),
      bodyText: documentBodyText(doc),
      createdAt: now,
      updatedAt: now,
    })
    .run();
  writeDocument(db, organizationId, id, doc, now);
  writeRevisions(db, organizationId, id, [
    {
      suffix: 'published',
      title: seedContent.landing.name,
      slug: 'default',
      values,
      bodies: { pitch: markdown },
      authorId: null,
      via: 'app',
      createdAt: now,
    },
  ]);
}

function writeDocument(db: Db, organizationId: string, id: string, doc: Doc, updatedAt: Date) {
  db.insert(schema.document)
    .values({
      organizationId,
      page: entryPage(id),
      state: encodeStateAsUpdate(doc),
      updatedAt,
    })
    .run();
}
