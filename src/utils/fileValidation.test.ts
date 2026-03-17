import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  validateImageFileOrMessage,
  FileValidationError,
} from './fileValidation';

describe('fileValidation', () => {
  const createFile = (type: string, size: number): File => {
    const blob = new Blob([new Uint8Array(size)], { type });
    return new File([blob], 'test.jpg', { type });
  };

  describe('validateImageFile', () => {
    it('accepts valid JPEG', () => {
      const file = createFile('image/jpeg', 1000);
      expect(() => validateImageFile(file)).not.toThrow();
    });

    it('accepts valid PNG', () => {
      const file = createFile('image/png', 1000);
      expect(() => validateImageFile(file)).not.toThrow();
    });

    it('accepts valid WebP', () => {
      const file = createFile('image/webp', 1000);
      expect(() => validateImageFile(file)).not.toThrow();
    });

    it('rejects invalid type with TYPE code', () => {
      const file = createFile('image/gif', 1000);
      expect(() => validateImageFile(file)).toThrow(FileValidationError);
      try {
        validateImageFile(file);
      } catch (e) {
        expect(e).toBeInstanceOf(FileValidationError);
        expect((e as FileValidationError).code).toBe('TYPE');
      }
    });

    it('rejects file over 5MB with SIZE code', () => {
      const file = createFile('image/jpeg', 6 * 1024 * 1024);
      expect(() => validateImageFile(file)).toThrow(FileValidationError);
      try {
        validateImageFile(file);
      } catch (e) {
        expect(e).toBeInstanceOf(FileValidationError);
        expect((e as FileValidationError).code).toBe('SIZE');
      }
    });

    it('accepts file exactly at max size', () => {
      const file = createFile('image/jpeg', 5 * 1024 * 1024);
      expect(() => validateImageFile(file)).not.toThrow();
    });

    it('respects custom maxSizeBytes', () => {
      const file = createFile('image/jpeg', 2 * 1024 * 1024);
      expect(() => validateImageFile(file, { maxSizeBytes: 1024 * 1024 })).toThrow(
        FileValidationError,
      );
      expect(() => validateImageFile(file, { maxSizeBytes: 3 * 1024 * 1024 })).not.toThrow();
    });
  });

  describe('validateImageFileOrMessage', () => {
    it('returns null for valid file', () => {
      const file = createFile('image/jpeg', 1000);
      expect(validateImageFileOrMessage(file)).toBeNull();
    });

    it('returns error message for invalid type', () => {
      const file = createFile('image/gif', 1000);
      const msg = validateImageFileOrMessage(file);
      expect(msg).toBeTruthy();
      expect(msg).toContain('Invalid file type');
    });

    it('returns error message for oversized file', () => {
      const file = createFile('image/jpeg', 6 * 1024 * 1024);
      const msg = validateImageFileOrMessage(file);
      expect(msg).toBeTruthy();
      expect(msg).toContain('Maximum size');
    });
  });
});
