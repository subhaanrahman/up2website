import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const inputSchema = z.object({
  action: z.enum(['approve', 'decline']),
  rsvp_id: z.string().uuid(),
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

    const allowed = await checkRateLimit('rsvp-approve', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action, rsvp_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rsvp, error: rsvpErr } = await serviceClient
      .from('rsvps')
      .select('id, event_id, user_id, status, guest_count')
      .eq('id', rsvp_id)
      .maybeSingle();

    if (rsvpErr || !rsvp) {
      return errorResponse(404, 'RSVP not found', { requestId });
    }

    const { data: event } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id, max_guests')
      .eq('id', rsvp.event_id)
      .maybeSingle();

    if (!event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    let isAuthorized = event.host_id === user.id;

    if (!isAuthorized) {
      const [cohostUser, cohostOrg] = await Promise.all([
        serviceClient.from('event_cohosts').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle(),
        serviceClient.from('event_cohosts').select('organiser_profile_id').eq('event_id', event.id).not('organiser_profile_id', 'is', null),
      ]);

      if (cohostUser.data) {
        isAuthorized = true;
      } else if (cohostOrg.data && cohostOrg.data.length > 0) {
        const orgIds = cohostOrg.data.map((r: any) => r.organiser_profile_id);
        const { data: orgOwner } = await serviceClient
          .from('organiser_profiles')
          .select('id, owner_id')
          .in('id', orgIds);
        if (orgOwner?.some((o: any) => o.owner_id === user.id)) isAuthorized = true;
      }
    }

    if (!isAuthorized && event.organiser_profile_id) {
      const { data: org } = await serviceClient
        .from('organiser_profiles')
        .select('owner_id')
        .eq('id', event.organiser_profile_id)
        .maybeSingle();
      if (org?.owner_id === user.id) isAuthorized = true;
    }

    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

    if (action === 'approve') {
      if (event.max_guests) {
        const [orderRows, rsvpRows] = await Promise.all([
          serviceClient
            .from('orders')
            .select('quantity, expires_at, status')
            .eq('event_id', event.id)
            .in('status', ['reserved', 'confirmed'])
            .gt('expires_at', new Date().toISOString()),
          serviceClient
            .from('rsvps')
            .select('guest_count')
            .eq('event_id', event.id)
            .eq('status', 'going'),
        ]);

        const orderQty = (orderRows.data ?? []).reduce((sum: number, o: any) => sum + (o.quantity ?? 0), 0);
        const rsvpGuests = (rsvpRows.data ?? []).reduce((sum: number, r: any) => sum + (r.guest_count ?? 1), 0);
        const totalOccupied = orderQty + rsvpGuests;
        if (totalOccupied + (rsvp.guest_count ?? 1) > event.max_guests) {
          return errorResponse(409, 'Event is at capacity', { requestId });
        }
      }

      const { error } = await serviceClient
        .from('rsvps')
        .update({ status: 'going', updated_at: new Date().toISOString() })
        .eq('id', rsvp.id);
      if (error) throw error;
    } else {
      const { error } = await serviceClient
        .from('rsvps')
        .update({ status: 'not_going', updated_at: new Date().toISOString() })
        .eq('id', rsvp.id);
      if (error) throw error;
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'rsvp-approve error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
