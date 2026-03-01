// Generic API client for calling Edge Functions

import { config } from './config';
import { parseApiError } from './errors';
import { supabase } from './supabase';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Call a Supabase Edge Function by name.
 * Automatically attaches the auth token and parses errors.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'POST', body, headers = {} } = options;

  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = `${config.functionsUrl}/${functionName}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabase.anonKey,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw parseApiError(res.status, json);
  }

  return json as T;
}
