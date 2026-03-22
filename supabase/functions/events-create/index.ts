import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

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

    // Rate limit
    const allowed = await checkRateLimit('events-create', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const {
      title,
      description,
      location,
      venue_name,
      address,
      cover_image,
      event_date,
      end_date,
      category,
      max_guests,
      is_public,
      organiser_profile_id,
      publish_at,
      tickets_available_from,
      tickets_available_until,
      vip_tables_enabled,
      refunds_enabled,
      refund_policy_text,
      refund_deadline_hours_before_event,
    } = body;

    const refundDeadlineHours = (() => {
      const v = refund_deadline_hours_before_event;
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (!Number.isFinite(n) || n < 0 || n > 168) return null;
      return n;
    })();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return errorResponse(400, 'title is required', { requestId });
    }
    if (!event_date) {
      return errorResponse(400, 'event_date is required', { requestId });
    }

    // Validate organiser_profile_id if provided
    let validatedOrgId: string | null = null;
    if (organiser_profile_id) {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: isOwner } = await adminClient.rpc('is_organiser_owner', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      });

      const { data: isMember } = await adminClient.rpc('is_organiser_member', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      });

      if (!isOwner && !isMember) {
        return errorResponse(403, 'You do not have access to this organiser profile', { requestId });
      }

      validatedOrgId = organiser_profile_id;
    }

    // Determine status: if publish_at is set in the future, mark as scheduled
    const isScheduled = publish_at && new Date(publish_at) > new Date();
    const eventStatus = isScheduled ? 'scheduled' : 'published';

    const { data, error } = await supabase
      .from('events')
      .insert({
        host_id: user.id,
        title: title.trim().slice(0, 200),
        description: description?.slice(0, 5000) || null,
        location: location?.slice(0, 500) || null,
        venue_name: typeof venue_name === 'string' ? venue_name.trim().slice(0, 500) || null : null,
        address: typeof address === 'string' ? address.trim().slice(0, 500) || null : null,
        cover_image:
          typeof cover_image === 'string' && cover_image.trim().length > 0
            ? cover_image.trim().slice(0, 2000)
            : null,
        event_date,
        end_date: end_date || null,
        category: category || 'party',
        max_guests: max_guests ? Math.min(Math.max(1, max_guests), 100000) : null,
        is_public: isScheduled ? false : (is_public !== false),
        organiser_profile_id: validatedOrgId,
        status: eventStatus,
        publish_at: isScheduled ? publish_at : null,
        tickets_available_from: tickets_available_from || null,
        tickets_available_until: tickets_available_until || null,
        vip_tables_enabled: vip_tables_enabled ?? false,
        refunds_enabled: refunds_enabled === true,
        refund_policy_text:
          typeof refund_policy_text === "string" && refund_policy_text.trim().length > 0
            ? refund_policy_text.trim().slice(0, 2000)
            : null,
        refund_deadline_hours_before_event: refundDeadlineHours,
      })
      .select()
      .single();

    if (error) {
      edgeLog('error', 'Insert error', { requestId, error: String(error) });
      return errorResponse(400, error.message, { requestId });
    }

    // Auto-create a post for this event in the feed
    try {
      const postContent = `🎉 ${data.title}${data.description ? ` — ${data.description.slice(0, 200)}` : ''}`;
      await supabase.from('posts').insert({
        author_id: user.id,
        organiser_profile_id: validatedOrgId,
        event_id: data.id,
        content: postContent,
        image_url: data.cover_image || null,
      });
    } catch (postErr) {
      edgeLog('error', 'Failed to create event post (non-fatal)', { requestId, error: String(postErr) });
    }

    return new Response(JSON.stringify({ ...data, request_id: requestId }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
