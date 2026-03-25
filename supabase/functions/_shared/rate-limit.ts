import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMITS: Record<string, { max: number; windowSec: number }> = {
  'rsvp':               { max: 20, windowSec: 60 },
  'events-create':      { max: 5,  windowSec: 60 },
  'profile-update':     { max: 10, windowSec: 60 },
  'referrals-track':    { max: 10, windowSec: 60 },
  'loyalty-award-points': { max: 15, windowSec: 60 },
  'settings-upsert':    { max: 10, windowSec: 60 },
  'orders-reserve':     { max: 10, windowSec: 60 },
  'payments-intent':    { max: 10, windowSec: 60 },
  'vip-reserve':        { max: 10, windowSec: 60 },
  'vip-payments-intent': { max: 10, windowSec: 60 },
  'vip-cancel':         { max: 10, windowSec: 60 },
  'send-otp':           { max: 5,  windowSec: 60 },
  'verify-otp':         { max: 5,  windowSec: 60 },
  'check-phone':        { max: 10, windowSec: 60 },
  'checkin-qr':         { max: 60, windowSec: 60 },
  'register':           { max: 5,  windowSec: 60 },
  'login':              { max: 10, windowSec: 60 },
  'refunds-create':     { max: 10, windowSec: 60 },
  'refunds-request-self': { max: 5, windowSec: 60 },
  'orders-cancel':      { max: 20, windowSec: 60 },
  'rsvp-approve':       { max: 30, windowSec: 60 },
  'event-message-send': { max: 30, windowSec: 60 },
  'event-media-upload': { max: 10, windowSec: 60 },
  'forgot-password-check': { max: 5, windowSec: 60 },
  'forgot-password-reset': { max: 5, windowSec: 60 },
  'profile-qr-regenerate': { max: 3, windowSec: 300 },
  'waitlist-promote':   { max: 20, windowSec: 60 },
  'rsvp-bulk-invite':   { max: 15, windowSec: 60 },
  'profile-search-host': { max: 40, windowSec: 60 },
};

const DEFAULT_LIMIT = { max: 30, windowSec: 60 };

/**
 * Check rate limit using the DB-backed check_rate_limit RPC.
 * Returns true if the request is ALLOWED.
 * Uses the service role client so RLS doesn't block access.
 */
export async function checkRateLimit(
  endpoint: string,
  userId: string | null,
  ipAddress: string | null,
): Promise<boolean> {
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { max, windowSec } = LIMITS[endpoint] ?? DEFAULT_LIMIT;

  const { data, error } = await serviceClient.rpc('check_rate_limit', {
    p_endpoint: endpoint,
    p_user_id: userId ?? null,
    p_ip_address: (!userId && ipAddress) ? ipAddress : null,
    p_max_requests: max,
    p_window_seconds: windowSec,
  });

  if (error) {
    console.error('Rate limit check failed:', error);
    return true; // fail open — don't block on infra error
  }

  return data === true;
}

export function getClientIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null;
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
