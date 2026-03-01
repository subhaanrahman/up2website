// Centralized error types and handling

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ApiError extends AppError {
  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message, 'API_ERROR', statusCode, details);
    this.name = 'ApiError';
  }
}

/** Parse an Edge Function JSON error response into an AppError */
export function parseApiError(status: number, body: unknown): AppError {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const b = body as { error: string; code?: string; details?: Record<string, unknown> };
    return new ApiError(b.error, status, b.details);
  }
  return new ApiError('An unexpected error occurred', status);
}
