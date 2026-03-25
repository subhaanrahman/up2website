import * as Sentry from '@sentry/react';

function shouldSendToSentryFromThisHost(): boolean {
  if (typeof window === 'undefined') return true;
  const suppressLocal =
    String((import.meta.env.VITE_SENTRY_SUPPRESS_LOCALHOST as string | undefined) ?? '').trim() === '1';
  if (!suppressLocal) return true;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return false;
  return true;
}

/** No-op when `VITE_SENTRY_DSN` is unset. Call once before rendering the app. */
export function initBrowserSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (!shouldSendToSentryFromThisHost()) return null;
      return event;
    },
  });
}

/** Safe to call when Sentry is not configured — returns immediately. */
export function captureClientException(error: unknown, context?: Record<string, unknown>): void {
  if (!(import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()) return;
  if (!shouldSendToSentryFromThisHost()) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
