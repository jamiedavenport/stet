import { describe, expect, it } from 'vite-plus/test';

import { toProfileName } from './profile';

describe('toProfileName', () => {
  it('splits a full name on the first space', () => {
    expect(toProfileName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(toProfileName('Mary Jane Watson')).toEqual({
      firstName: 'Mary',
      lastName: 'Jane Watson',
    });
  });

  it('keeps single names as first name only', () => {
    expect(toProfileName('Ada')).toEqual({ firstName: 'Ada' });
  });

  it('returns nothing for missing or blank names', () => {
    expect(toProfileName(undefined)).toEqual({});
    expect(toProfileName('   ')).toEqual({});
  });
});
