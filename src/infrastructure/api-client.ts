import { config } from './config';
import { parseApiError } from './errors';
import { supabase } from './supabase';
import { createLogger } from './logger';
import { captureApiError } from './errorCapture';

const log = createLogger('api-client');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

function generateRequestId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

const PUBLIC_FUNCTIONS = new Set([
  'check-phone', 'login', 'register', 'send-otp', 'verify-otp', 'dev-login', 'health',
  'forgot-password-check', 'forgot-password-reset',
]);

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'POST', body, headers = {} } = options;
  const requestId = generateRequestId();

  log.info('Edge function request', { functionName, method, requestId });

  let token: string | undefined;
  if (!PUBLIC_FUNCTIONS.has(functionName)) {
    const { data: { session } } = await supabase.auth.getSession();

    // Proactively refresh if the token expires within 5 minutes to avoid "invalid JWT" from Edge Functions
    let sessionToUse = session;
    if (session?.expires_at) {
      const expiresMs = session.expires_at * 1000;
      if (expiresMs - Date.now() < 5 * 60 * 1000) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (!error && refreshed.session) {
          sessionToUse = refreshed.session;
        }
      }
    }

    token = sessionToUse?.access_token;
  }

  const url = `${config.functionsUrl}/${functionName}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': config.supabase.anonKey,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...headers,
  };

  // Only send X-Request-ID if the edge functions are deployed with updated CORS
  // that allows this header. Safe to enable after pushing the _shared/response.ts update.
  // reqHeaders['X-Request-ID'] = requestId;

  let res = await fetch(url, {
    method,
    headers: reqHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let json = await res.json().catch(() => null);

  // On 401, try refreshing the session once and retry (handles token expiry between check and request)
  if (res.status === 401 && token && !PUBLIC_FUNCTIONS.has(functionName)) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const newToken = refreshed.session?.access_token;
    if (newToken) {
      log.info('Retrying after session refresh', { functionName, requestId });
      res = await fetch(url, {
        method,
        headers: { ...reqHeaders, Authorization: `Bearer ${newToken}` },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      json = await res.json().catch(() => null);
    }
  }

  if (!res.ok) {
    const err = parseApiError(res.status, json);
    captureApiError(err, { functionName, requestId, status: res.status });
    throw err;
  }

  return json as T;
}
