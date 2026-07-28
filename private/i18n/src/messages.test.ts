import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';

import { baseLocale, isLocale, locales } from './index.ts';
import { m } from './paraglide/messages.js';

// Must match the pathPattern array in project.inlang/settings.json.
const surfaces = ['web', 'marketing', 'mail', 'common'] as const;

function keysOfFile(locale: string, surface: string): string[] {
  const url = new URL(`../messages/${locale}/${surface}.json`, import.meta.url);
  const data = JSON.parse(readFileSync(url, 'utf8')) as Record<string, unknown>;
  return Object.keys(data).filter((key) => key !== '$schema');
}

function keysOf(locale: string): string[] {
  return surfaces.flatMap((surface) => keysOfFile(locale, surface)).sort();
}

describe('message files', () => {
  it('ship the same keys for every locale', () => {
    const [first, ...rest] = locales.map((locale) => keysOf(locale));
    for (const keys of rest) {
      expect(keys).toEqual(first);
    }
  });

  it('keeps each key in exactly one surface file', () => {
    // The plugin merges the split files by pathPattern order, silently
    // letting a later file win on a duplicate key, so a key defined in two
    // files would not fail to compile, only fail to say what it looks like.
    for (const locale of locales) {
      const keys = surfaces.flatMap((surface) => keysOfFile(locale, surface));
      expect(keys.length).toBe(new Set(keys).size);
    }
  });
});

describe('runtime', () => {
  it('narrows locale strings', () => {
    expect(isLocale('es')).toBe(true);
    expect(isLocale('tlh')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(baseLocale).toBe('en');
  });
});

describe('messages', () => {
  it('render each locale on demand', () => {
    expect(m.sign_in({}, { locale: 'en' })).toBe('Sign in');
    expect(m.sign_in({}, { locale: 'es' })).toBe('Iniciar sesión');
    expect(m.sign_in({}, { locale: 'fr' })).toBe('Se connecter');
  });

  it('pluralize with the locale rules', () => {
    expect(m.up_to_members({ memberLimit: 1 }, { locale: 'en' })).toBe('Up to 1 member');
    expect(m.up_to_members({ memberLimit: 5 }, { locale: 'en' })).toBe('Up to 5 members');
    expect(m.up_to_members({ memberLimit: 5 }, { locale: 'fr' })).toBe("Jusqu'à 5 membres");
  });

  it('render localized mail subjects with parameters', () => {
    expect(m.reset_password_subject({ brandName: 'Stet' }, { locale: 'fr' })).toBe(
      'Réinitialisez votre mot de passe Stet',
    );
  });
});
