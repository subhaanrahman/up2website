import { describe, it, expect } from 'vitest';
import {
  phoneLocalIdentityEmail,
  phoneLocalIdentityVariants,
  phoneLocalIdentityVariantsExcluding,
  redactEmailForLog,
} from '../../supabase/functions/_shared/phone-local-identity.ts';

describe('phoneLocalIdentity', () => {
  it('phoneLocalIdentityEmail strips non-digits', () => {
    expect(phoneLocalIdentityEmail('+61 412 345 678')).toBe('61412345678@phone.local');
  });

  it('phoneLocalIdentityVariants AU E.164 includes national 04 form', () => {
    const v = phoneLocalIdentityVariants('61412345678');
    expect(v).toContain('61412345678@phone.local');
    expect(v).toContain('0412345678@phone.local');
  });

  it('phoneLocalIdentityVariantsExcluding removes canonical email (avoid duplicate generateLink)', () => {
    const canonical = '61412345678@phone.local';
    const filtered = phoneLocalIdentityVariantsExcluding('61412345678', [canonical]);
    expect(filtered).not.toContain(canonical);
    expect(filtered).toContain('0412345678@phone.local');
  });

  it('phoneLocalIdentityVariants AU national 04 includes 61 form', () => {
    const v = phoneLocalIdentityVariants('0412345678');
    expect(v).toContain('0412345678@phone.local');
    expect(v).toContain('61412345678@phone.local');
  });

  it('phoneLocalIdentityVariants US 11-digit NANP', () => {
    const v = phoneLocalIdentityVariants('15551234567');
    expect(v).toContain('15551234567@phone.local');
    expect(v).toContain('5551234567@phone.local');
  });

  it('redactEmailForLog masks local part', () => {
    const r = redactEmailForLog('hello@example.com');
    expect(r).toContain('@example.com');
    expect(r).not.toContain('hello');
  });
});
