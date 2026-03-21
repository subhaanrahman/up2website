import * as Sentry from '@sentry/react';

/** No-op when `VITE_SENTRY_DSN` is unset. Call once before rendering the app. */
export function initBrowserSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

/** Safe to call when Sentry is not configured — returns immediately. */
export function captureClientException(error: unknown, context?: Record<string, unknown>): void {
  if (!(import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
