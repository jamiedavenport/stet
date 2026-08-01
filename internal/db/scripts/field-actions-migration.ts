import { isDeepStrictEqual } from 'node:util';

import { Doc, XmlElement, XmlHook, XmlText, applyUpdate, encodeStateAsUpdate } from 'yjs';

export type FieldMapping = {
  id: string;
  key: string;
  type: string;
};

export function migrateRecord(
  source: string,
  fields: FieldMapping[],
  label: string,
): { changed: boolean; value: string } {
  const value = JSON.parse(source) as Record<string, unknown>;
  let changed = false;

  for (const field of fields) {
    if (!Object.hasOwn(value, field.key)) {
      continue;
    }
    if (Object.hasOwn(value, field.id) && !isDeepStrictEqual(value[field.id], value[field.key])) {
      throw new Error(`${label} contains conflicting values for ${field.key} and ${field.id}.`);
    }
    value[field.id] = value[field.key];
    delete value[field.key];
    changed = true;
  }

  return { changed, value: JSON.stringify(value) };
}

export function migrateDocument(
  state: Uint8Array,
  fields: FieldMapping[],
  label: string,
): { changed: boolean; state: Uint8Array } {
  const doc = new Doc();
  applyUpdate(doc, state);
  let changed = false;

  doc.transact(() => {
    for (const field of fields.filter((candidate) => candidate.type === 'rich_text')) {
      const source = doc.getXmlFragment(`body:${field.key}`);
      if (source.length === 0) {
        continue;
      }
      const target = doc.getXmlFragment(`body:${field.id}`);
      if (target.length !== 0) {
        throw new Error(`${label} contains both body:${field.key} and body:${field.id}.`);
      }
      target.insert(0, source.toArray().map(cloneXml));
      source.delete(0, source.length);
      changed = true;
    }
  });

  return { changed, state: encodeStateAsUpdate(doc) };
}

function cloneXml(node: XmlElement | XmlHook | XmlText): XmlElement | XmlText {
  if (node instanceof XmlText) {
    const clone = new XmlText();
    clone.applyDelta(node.toDelta());
    return clone;
  }
  if (node instanceof XmlElement) {
    const clone = new XmlElement(node.nodeName);
    for (const [key, value] of Object.entries(node.getAttributes())) {
      if (value !== undefined) {
        clone.setAttribute(key, value);
      }
    }
    clone.insert(0, node.toArray().map(cloneXml));
    return clone;
  }
  throw new Error('Entry bodies cannot contain Yjs XML hooks.');
}
