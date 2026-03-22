import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { processRefund } from "../_shared/refund.ts";

/** Decode JWT payload (middle segment); returns role claim or null if not a valid Supabase JWT. */
function jwtPayloadRole(secret: string): { role: string } | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  try {
    const json = atob(b64);
    const payload = JSON.parse(json) as { role?: string };
    if (typeof payload.role !== 'string') return null;
    return { role: payload.role };
  } catch {
    return null;
  }
}

const SERVICE_ROLE_CONFIG_MSG =
  'Use the secret key from Supabase Dashboard → Project Settings → API: legacy service_role JWT (eyJ…) or new sb_secret_… key — not anon or sb_publishable_*. Set under Edge Functions secrets and redeploy events-update.';

const EVENTS_PERM_HINT =
  'Ensure SUPABASE_ANON_KEY in Edge Functions matches this project, the request includes Authorization: Bearer <user access token>, and migration 20260331120200_events_organiser_rls is applied for organiser editors.';

/**
 * Supabase now offers non-JWT keys (`sb_secret_…`). Legacy keys are JWTs with `role: "service_role"`.
 * Reject obvious mistakes: publishable key, or anon JWT. Otherwise accept and let PostgREST validate.
 */
function validateServiceRoleKey(secret: string): { ok: true } | { ok: false; message: string } {
  const t = secret.trim();
  if (!t) {
    return { ok: false, message: `Missing SUPABASE_SERVICE_ROLE_KEY. ${SERVICE_ROLE_CONFIG_MSG}` };
  }
  if (t.startsWith('sb_publishable_')) {
    return {
      ok: false,
      message: `SUPABASE_SERVICE_ROLE_KEY is set to the publishable (anon) key. ${SERVICE_ROLE_CONFIG_MSG}`,
    };
  }
  if (t.startsWith('sb_secret_')) {
    return { ok: true };
  }
  const parts = t.split('.');
  if (parts.length === 3) {
    const roleClaim = jwtPayloadRole(t);
    if (roleClaim?.role === 'anon') {
      return {
        ok: false,
        message: `SUPABASE_SERVICE_ROLE_KEY looks like the anon JWT. ${SERVICE_ROLE_CONFIG_MSG}`,
      };
    }
    if (roleClaim?.role === 'service_role') {
      return { ok: true };
    }
    return { ok: true };
  }
  return { ok: true };
}

function mapEventsTablePermissionError(message: string): string {
  if (/permission denied for table events/i.test(message)) {
    return `${message} — ${EVENTS_PERM_HINT}`;
  }
  return message;
}

function parseBearerAccessToken(authHeader: string | null): string | null {
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
  const t = authHeader.slice(7).trim();
  return t.length > 0 ? t : null;
}

/** Case-insensitive UUID string compare. */
function uuidEquals(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase();
}

const updateSchema = z.object({
  action: z.enum(['update', 'delete']),
  event_id: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().uuid(),
  ),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  venue_name: z.string().max(500).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  event_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  max_guests: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().optional(),
  cover_image: z.string().url().nullable().optional(),
  publish_at: z.string().nullable().optional(),
  tickets_available_from: z.string().nullable().optional(),
  tickets_available_until: z.string().nullable().optional(),
  vip_tables_enabled: z.boolean().optional(),
  refunds_enabled: z.boolean().optional(),
  refund_policy_text: z.string().max(2000).nullable().optional(),
  refund_deadline_hours_before_event: z.number().int().min(0).max(168).nullable().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    if (!anonKey?.trim()) {
      edgeLog('error', 'events-update: SUPABASE_ANON_KEY missing', { requestId });
      return errorResponse(500, 'Missing SUPABASE_ANON_KEY in Edge Function secrets.', { requestId });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const accessToken = parseBearerAccessToken(authHeader);
    if (accessToken) {
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
      if (sessionErr) {
        edgeLog('warn', 'events-update: setSession', { requestId, message: sessionErr.message });
      }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    const allowed = await checkRateLimit('events-update', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action, event_id, ...fields } = parsed.data;

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const keyCheck = validateServiceRoleKey(serviceRoleKey);
    if (!keyCheck.ok) {
      edgeLog('error', 'events-update: SUPABASE_SERVICE_ROLE_KEY rejected', { requestId });
      return errorResponse(500, keyCheck.message, { requestId });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Load event with caller JWT (RLS: host + organiser policies after migration 20260331120200)
    const { data: event, error: fetchErr } = await supabase
      .from('events')
      .select('id, host_id, organiser_profile_id, publish_at, status, is_public')
      .eq('id', event_id)
      .maybeSingle();

    if (fetchErr) {
      edgeLog('error', 'events-update: event fetch failed', {
        requestId,
        code: fetchErr.code,
        message: fetchErr.message,
      });
      return errorResponse(
        400,
        mapEventsTablePermissionError(fetchErr.message || 'Database error loading event'),
        { requestId },
      );
    }
    if (!event) {
      edgeLog('warn', 'events-update: event not found (no row for event_id)', {
        requestId,
        event_id,
        user_id: user.id,
      });
      return errorResponse(404, 'Event not found', { requestId });
    }

    let isAuthorized = uuidEquals(event.host_id, user.id);

    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        supabase
          .from('organiser_profiles')
          .select('owner_id')
          .eq('id', event.organiser_profile_id)
          .maybeSingle(),
        supabase
          .from('organiser_members')
          .select('id')
          .eq('organiser_profile_id', event.organiser_profile_id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle(),
      ]);
      if (
        (orgResult.data?.owner_id && uuidEquals(orgResult.data.owner_id, user.id)) ||
        memberResult.data
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

    const hostMatch = uuidEquals(event.host_id, user.id);
    edgeLog('info', 'events-update: authorized', {
      requestId,
      action,
      event_id,
      mutate_via: 'user',
      host_match: hostMatch,
      has_organiser_profile_id: !!event.organiser_profile_id,
    });

    if (action === 'delete') {
      const { data: confirmedOrders } = await serviceClient
        .from('orders')
        .select('id')
        .eq('event_id', event_id)
        .eq('status', 'confirmed');

      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (confirmedOrders && confirmedOrders.length > 0 && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        for (const o of confirmedOrders) {
          const result = await processRefund({
            orderId: o.id,
            reason: 'Event cancelled',
            initiatedBy: user.id,
            stripe,
            serviceClient,
          });
          if (!result.success) {
            edgeLog('warn', 'Refund failed during event delete', { requestId, order_id: o.id, error: result.error });
          }
        }
      }

      const { error: delErr } = await supabase.from('events').delete().eq('id', event_id);
      if (delErr) {
        const msg = mapEventsTablePermissionError(delErr.message);
        const hint =
          /permission denied for table events/i.test(delErr.message) && !hostMatch
            ? 'Organiser delete path requires migration 20260331120200_events_organiser_rls.'
            : undefined;
        return errorResponse(400, msg, { requestId, details: hint ? { hint } : undefined });
      }
      return successResponse({ success: true, deleted: true }, requestId);
    }

    const updateData: Record<string, unknown> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.location !== undefined) updateData.location = fields.location;
    if (fields.venue_name !== undefined) updateData.venue_name = fields.venue_name;
    if (fields.address !== undefined) updateData.address = fields.address;
    if (fields.event_date !== undefined) updateData.event_date = fields.event_date;
    if (fields.end_date !== undefined) updateData.end_date = fields.end_date;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.max_guests !== undefined) updateData.max_guests = fields.max_guests;
    if (fields.is_public !== undefined) updateData.is_public = fields.is_public;
    if (fields.cover_image !== undefined) updateData.cover_image = fields.cover_image;
    if (fields.publish_at !== undefined) updateData.publish_at = fields.publish_at;
    if (fields.tickets_available_from !== undefined) updateData.tickets_available_from = fields.tickets_available_from;
    if (fields.tickets_available_until !== undefined) updateData.tickets_available_until = fields.tickets_available_until;
    if (fields.vip_tables_enabled !== undefined) updateData.vip_tables_enabled = fields.vip_tables_enabled;
    if (fields.refunds_enabled !== undefined) updateData.refunds_enabled = fields.refunds_enabled;
    if (fields.refund_policy_text !== undefined) {
      updateData.refund_policy_text =
        fields.refund_policy_text === null || fields.refund_policy_text.trim() === ""
          ? null
          : fields.refund_policy_text.trim().slice(0, 2000);
    }
    if (fields.refund_deadline_hours_before_event !== undefined) {
      updateData.refund_deadline_hours_before_event = fields.refund_deadline_hours_before_event;
    }

    if (fields.publish_at !== undefined) {
      const publishAtVal = updateData.publish_at as string | null | undefined;
      const isScheduled = publishAtVal != null && new Date(publishAtVal) > new Date();
      if (isScheduled) {
        updateData.status = 'scheduled';
        updateData.is_public = false;
        updateData.publish_at = publishAtVal;
      } else {
        updateData.status = 'published';
        updateData.publish_at = null;
        if (fields.is_public === undefined) {
          updateData.is_public = true;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(400, 'No fields to update', { requestId });
    }

    const { data: updated, error: updErr } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', event_id)
      .select()
      .single();

    if (updErr) {
      const msg = mapEventsTablePermissionError(updErr.message);
      const hint =
        /permission denied for table events/i.test(updErr.message) && !hostMatch
          ? 'Organiser update path requires migration 20260331120200_events_organiser_rls.'
          : undefined;
      return errorResponse(400, msg, { requestId, details: hint ? { hint } : undefined });
    }

    return successResponse(updated, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
