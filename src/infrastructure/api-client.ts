import { FunctionsHttpError } from '@supabase/functions-js';
import { config } from './config';
import { ApiError, AuthError, parseApiError } from './errors';
import { supabase } from './supabase';
import { createLogger } from './logger';
import { captureApiError } from './errorCapture';

const log = createLogger('api-client');

/** Decode JWT payload (no verification) — used only for project alignment checks. */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function supabaseAuthOriginFromAppUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/** Issuer in access tokens is e.g. https://&lt;ref&gt;.supabase.co/auth/v1 or http://127.0.0.1:54321/auth/v1 */
function supabaseAuthOriginFromIss(iss: string): string | null {
  try {
    const i = new URL(iss.replace(/\/$/, ''));
    return `${i.protocol}//${i.host}`;
  } catch {
    return null;
  }
}

function projectRefFromSupabaseCoUrl(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname;
    if (!host.endsWith('.supabase.co')) return null;
    return host.replace(/\.supabase\.co$/, '');
  } catch {
    return null;
  }
}

/**
 * Legacy anon JWT keys include `ref`. New sb_publishable_* keys are not JWTs — skip when absent.
 */
function projectRefFromAnonKey(anonKey: string): string | null {
  if (!anonKey || !anonKey.includes('.')) return null;
  const p = decodeJwtPayload(anonKey);
  return typeof p?.ref === 'string' ? p.ref : null;
}

/**
 * Ensures the JWT was issued for the same Supabase project as `VITE_SUPABASE_URL` / publishable key.
 * Use after project migration so stale sessions in localStorage are cleared instead of causing RLS / permission errors.
 */
export function assertSessionMatchesProjectEnv(accessToken: string): void {
  const appOrigin = supabaseAuthOriginFromAppUrl(config.supabase.url);
  const payload = decodeJwtPayload(accessToken);
  const iss = typeof payload?.iss === 'string' ? payload.iss : null;
  const tokenOrigin = iss ? supabaseAuthOriginFromIss(iss) : null;

  const urlRef = projectRefFromSupabaseCoUrl(config.supabase.url);
  const anonRef = projectRefFromAnonKey(config.supabase.anonKey);
  const issRef =
    iss && iss.includes('.supabase.co')
      ? (() => {
          const m = iss.match(/^https?:\/\/([^.]+)\.supabase\.co\/auth\/v1\/?$/i);
          return m ? m[1] : null;
        })()
      : null;

  if (appOrigin && tokenOrigin && appOrigin !== tokenOrigin) {
    throw new AuthError(
      'Your saved session is for a different Supabase project than VITE_SUPABASE_URL. Sign out, align .env (URL + publishable key from the same project), restart the dev server, then sign in again.',
    );
  }

  if (urlRef && anonRef && urlRef !== anonRef) {
    throw new AuthError(
      'VITE_SUPABASE_PUBLISHABLE_KEY does not belong to the same project as VITE_SUPABASE_URL. Fix .env in Settings → API, restart the dev server, then sign in again.',
    );
  }

  if (issRef && anonRef && issRef !== anonRef) {
    throw new AuthError(
      'Your session token does not match VITE_SUPABASE_PUBLISHABLE_KEY (different project refs). Sign out and sign in again after fixing .env.',
    );
  }
}

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

/** Avoid calling `getUser()` on every edge request (e.g. connect-status polling). */
let edgeAuthPreflightOkUntil = 0;
let lastPreflightAccessToken: string | undefined;
const EDGE_AUTH_PREFLIGHT_TTL_MS = 45_000;

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
    if (!token) {
      throw new AuthError(
        'Not signed in or session not ready. Wait a moment, or sign out and sign in again. If this persists, check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are from the same project.',
      );
    }

    assertSessionMatchesProjectEnv(token);

    // Validates with Auth API — catches stale/invalid JWT before the functions gateway returns opaque "Invalid JWT"
    const now = Date.now();
    const tokenChanged = token !== lastPreflightAccessToken;
    if (tokenChanged || now > edgeAuthPreflightOkUntil) {
      let { error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed.session?.access_token) {
          token = refreshed.session.access_token;
          assertSessionMatchesProjectEnv(token);
          ({ error: getUserError } = await supabase.auth.getUser());
        }
      }
      if (getUserError) {
        edgeAuthPreflightOkUntil = 0;
        lastPreflightAccessToken = undefined;
        throw new AuthError(
          `Session is invalid (${getUserError.message}). Sign out and sign in again. If your .env was recently changed, restart the dev server so VITE_SUPABASE_* picks up the correct project.`,
        );
      }
      lastPreflightAccessToken = token;
      edgeAuthPreflightOkUntil = now + EDGE_AUTH_PREFLIGHT_TTL_MS;
    }
  }

  /**
   * Use the Supabase client's `functions.invoke` → same `fetchWithAuth` as PostgREST.
   * It sets `apikey` + `Authorization` immediately before the request from `getSession()`,
   * avoiding drift from a manually built `fetch` (helps with gateway "Invalid JWT").
   */
  const invokeOptions: Parameters<typeof supabase.functions.invoke>[1] = {
    method: method as 'POST',
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body !== undefined ? { body } : {}),
  };

  const runInvoke = () => supabase.functions.invoke(functionName, invokeOptions);

  let { data, error: invokeError } = await runInvoke();

  if (
    invokeError instanceof FunctionsHttpError &&
    invokeError.context.status === 401 &&
    !PUBLIC_FUNCTIONS.has(functionName)
  ) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) {
      lastPreflightAccessToken = undefined;
      edgeAuthPreflightOkUntil = 0;
      log.info('Retrying invoke after session refresh', { functionName, requestId });
      ({ data, error: invokeError } = await runInvoke());
    }
  }

  if (invokeError) {
    if (invokeError instanceof FunctionsHttpError) {
      const res = invokeError.context;
      const json = await res.json().catch(() => null);
      let err = parseApiError(res.status, json);
      if (res.status === 401 && /invalid jwt/i.test(err.message)) {
        const gatewayHint = !config.supabase.usesLegacyJwtAnonKey
          ? ' With sb_publishable_* keys, the Edge gateway may reject JWT before your function runs — set verify_jwt = false for that function in supabase/config.toml, redeploy it, and keep auth in getUser() inside the function.'
          : '';
        err = new ApiError(
          `${err.message} — Confirm Edge secrets SUPABASE_URL + SUPABASE_ANON_KEY match this project and redeploy.${gatewayHint} Restart Vite after .env changes; sign out and sign in if the session is stale.`,
          401,
          err.details,
        );
      }
      captureApiError(err, { functionName, requestId, status: res.status });
      throw err;
    }
    const fallback = new ApiError(invokeError.message || 'Edge function request failed', 500);
    captureApiError(fallback, { functionName, requestId, status: 500 });
    throw fallback;
  }

  return data as T;
}
