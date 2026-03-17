import { describe, it, expect } from 'vitest';
import { LIMITS, validateMaxLength, truncateToMax } from './validation';

describe('validation', () => {
  describe('LIMITS', () => {
    it('has expected keys and positive values', () => {
      expect(LIMITS.bio).toBe(500);
      expect(LIMITS.eventDescription).toBe(2000);
      expect(LIMITS.postContent).toBe(5000);
      expect(LIMITS.messageContent).toBe(5000);
      expect(LIMITS.displayName).toBe(100);
      expect(LIMITS.eventTitle).toBe(200);
    });
  });

  describe('validateMaxLength', () => {
    it('returns true when within limit', () => {
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('', 5)).toBe(true);
      expect(validateMaxLength('abc', 3)).toBe(true);
    });

    it('returns false when over limit', () => {
      expect(validateMaxLength('hello world', 5)).toBe(false);
      expect(validateMaxLength('x'.repeat(101), 100)).toBe(false);
    });
  });

  describe('truncateToMax', () => {
    it('returns value unchanged when within limit', () => {
      expect(truncateToMax('hello', 10)).toBe('hello');
      expect(truncateToMax('', 5)).toBe('');
    });

    it('truncates when over limit', () => {
      expect(truncateToMax('hello world', 5)).toBe('hello');
      expect(truncateToMax('abcdefgh', 3)).toBe('abc');
    });
  });
});
