import { describe, expect, it } from 'vite-plus/test';

import { localized } from './localized.ts';

describe('localized', () => {
  it('binds messages to the locale without a per-call option', () => {
    expect(localized('en').sign_in()).toBe('Sign in');
    expect(localized('fr').sign_in()).toBe('Se connecter');
  });

  it('keeps typed inputs and locale-correct plurals', () => {
    const t = localized('fr');
    expect(t.reset_password_subject({ brandName: 'Onyx' })).toBe(
      'Réinitialisez votre mot de passe Onyx',
    );
    expect(t.up_to_members({ memberLimit: 5 })).toBe("Jusqu'à 5 membres");
  });

  it('returns the same bound object per locale', () => {
    expect(localized('en')).toBe(localized('en'));
  });

  it('preserves the message signatures', () => {
    const t = localized('en');
    // @ts-expect-error required inputs are still required
    t.reset_password_subject();
    // @ts-expect-error there is no trailing locale option once bound
    t.sign_in({}, { locale: 'fr' });
  });
});
