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

/** Safely produce a short excerpt of response body for debugging */
function bodyExcerpt(body: unknown, maxLen = 200): string {
  if (body === null || body === undefined) return '(empty or non-JSON)';
  try {
    const s = typeof body === 'string' ? body : JSON.stringify(body);
    return s.length <= maxLen ? s : s.slice(0, maxLen) + '…';
  } catch {
    return '(unable to serialize)';
  }
}

/** Parse an Edge Function JSON error response into an AppError */
export function parseApiError(status: number, body: unknown): AppError {
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    const msg = (b.error ?? b.message ?? b.msg) as string | undefined;
    if (typeof msg === 'string' && msg) {
      const details = { ...(b.details as Record<string, unknown>) };
      if (b.request_id) details.request_id = b.request_id;
      return new ApiError(msg, status, Object.keys(details).length > 0 ? details : undefined);
    }
  }
  const excerpt = bodyExcerpt(body);
  const fallback = status === 401 ? 'Session expired. Please log out and log back in.' : 'An unexpected error occurred.';
  return new ApiError(fallback, status, { status, bodyExcerpt: excerpt });
}
