import { describe, it, expect } from 'vitest';
import { buildDualColumnIlikeOr } from './postgrest-ilike';

describe('buildDualColumnIlikeOr', () => {
  it('quotes patterns so spaces are safe in PostgREST or()', () => {
    expect(buildDualColumnIlikeOr(['display_name', 'username'], 'John Smith')).toBe(
      'display_name.ilike."%John Smith%",username.ilike."%John Smith%"',
    );
  });

  it('escapes double quotes in the search term', () => {
    expect(buildDualColumnIlikeOr(['a', 'b'], 'say "hi"')).toBe(
      'a.ilike."%say ""hi""%",b.ilike."%say ""hi""%"',
    );
  });

  it('strips LIKE wildcards from user input', () => {
    expect(buildDualColumnIlikeOr(['a', 'b'], '100%')).toBe('a.ilike."%100%",b.ilike."%100%"');
    expect(buildDualColumnIlikeOr(['a', 'b'], 'a_b')).toBe('a.ilike."%ab%",b.ilike."%ab%"');
  });
});
