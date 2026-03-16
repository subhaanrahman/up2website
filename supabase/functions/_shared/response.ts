export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}

export function errorResponse(
  status: number,
  error: string,
  opts?: { code?: string; requestId?: string; details?: unknown },
): Response {
  const body: Record<string, unknown> = { error };
  if (opts?.code) body.code = opts.code;
  if (opts?.requestId) body.request_id = opts.requestId;
  if (opts?.details !== undefined) body.details = opts.details;

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function successResponse(data: unknown, requestId?: string): Response {
  const body =
    typeof data === 'object' && data !== null ? { ...data } : { data };
  if (requestId) (body as Record<string, unknown>).request_id = requestId;

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
