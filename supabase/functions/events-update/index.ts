import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { processRefund } from "../_shared/refund.ts";

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

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

    // Use service role to bypass RLS for ownership check and mutations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify ownership (direct host or organiser profile owner/member)
    const { data: event, error: fetchErr } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id')
      .eq('id', event_id)
      .maybeSingle();

    if (fetchErr) {
      edgeLog('error', 'events-update: event fetch failed', {
        requestId,
        code: fetchErr.code,
        message: fetchErr.message,
      });
      return errorResponse(400, fetchErr.message || 'Database error loading event', { requestId });
    }
    if (!event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    let isAuthorized = event.host_id === user.id;

    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        serviceClient
          .from('organiser_profiles')
          .select('owner_id')
          .eq('id', event.organiser_profile_id)
          .maybeSingle(),
        serviceClient
          .from('organiser_members')
          .select('id')
          .eq('organiser_profile_id', event.organiser_profile_id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle(),
      ]);
      if (orgResult.data?.owner_id === user.id || memberResult.data) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

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

      const { error: delErr } = await serviceClient.from('events').delete().eq('id', event_id);
      if (delErr) {
        return errorResponse(400, delErr.message, { requestId });
      }
      return successResponse({ success: true, deleted: true }, requestId);
    }

    // Build update object
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

    if (Object.keys(updateData).length === 0) {
      return errorResponse(400, 'No fields to update', { requestId });
    }

    const { data: updated, error: updErr } = await serviceClient
      .from('events')
      .update(updateData)
      .eq('id', event_id)
      .select()
      .single();

    if (updErr) {
      return errorResponse(400, updErr.message, { requestId });
    }

    return successResponse(updated, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
