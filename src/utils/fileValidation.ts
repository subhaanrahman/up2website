/**
 * Client-side file validation for uploads.
 * Must align with backend limits where applicable.
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface ValidateImageOptions {
  maxSizeBytes?: number;
  allowedTypes?: readonly string[];
}

export class FileValidationError extends Error {
  constructor(
    message: string,
    public readonly code: 'TYPE' | 'SIZE' | 'DIMENSIONS',
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validate an image file before upload.
 * @throws FileValidationError if validation fails
 */
export function validateImageFile(
  file: File,
  options: ValidateImageOptions = {},
): void {
  const {
    maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    allowedTypes = ALLOWED_IMAGE_TYPES,
  } = options;

  if (!allowedTypes.includes(file.type as any)) {
    throw new FileValidationError(
      `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      'TYPE',
    );
  }

  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new FileValidationError(
      `File too large. Maximum size: ${maxMb}MB`,
      'SIZE',
    );
  }
}

/**
 * Validate image file and return a user-friendly error message, or null if valid.
 */
export function validateImageFileOrMessage(
  file: File,
  options?: ValidateImageOptions,
): string | null {
  try {
    validateImageFile(file, options);
    return null;
  } catch (err) {
    return err instanceof FileValidationError ? err.message : 'Invalid file';
  }
}
