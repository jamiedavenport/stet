import { describe, expect, it } from 'vite-plus/test';
import { Doc, XmlElement, XmlText, applyUpdate, encodeStateAsUpdate } from 'yjs';

import { migrateDocument, migrateRecord } from './field-actions-migration';

const fields = [
  { id: 'field-title', key: 'title', type: 'text' },
  { id: 'field-body', key: 'body', type: 'rich_text' },
];

describe('field actions data migration', () => {
  it('moves record values from public keys to stable ids and is idempotent', () => {
    const first = migrateRecord('{"title":"Hello","unknown":true}', fields, 'entry one');
    expect(first).toEqual({
      changed: true,
      value: '{"unknown":true,"field-title":"Hello"}',
    });
    expect(migrateRecord(first.value, fields, 'entry one')).toEqual({
      changed: false,
      value: first.value,
    });
  });

  it('moves rich text roots from public keys to stable ids and is idempotent', () => {
    const doc = new Doc();
    const paragraph = new XmlElement('paragraph');
    paragraph.setAttribute('align', 'left');
    paragraph.insert(0, [new XmlText('Hello')]);
    doc.getXmlFragment('body:body').insert(0, [paragraph]);

    const first = migrateDocument(encodeStateAsUpdate(doc), fields, 'entry one');
    const migrated = new Doc();
    applyUpdate(migrated, first.state);
    expect(first.changed).toBe(true);
    expect(migrated.getXmlFragment('body:body').toJSON()).toBe('');
    expect(migrated.getXmlFragment('body:field-body').toJSON()).toContain('Hello');
    expect(migrateDocument(first.state, fields, 'entry one').changed).toBe(false);
  });

  it('rejects ambiguous values instead of overwriting them', () => {
    expect(() => migrateRecord('{"title":"old","field-title":"new"}', fields, 'entry one')).toThrow(
      'conflicting values',
    );
  });
});
