import { createLogger } from './logger';
import type { AppError } from './errors';
import { captureClientException } from './sentry';

type ApiError = AppError;
const log = createLogger('error-capture');

export interface CaptureContext {
  functionName?: string;
  requestId?: string;
  status?: number;
  [key: string]: unknown;
}

export function captureApiError(error: ApiError, context?: CaptureContext): void {
  log.error('API error captured', error, context ?? {});
  captureClientException(error, context);
}
