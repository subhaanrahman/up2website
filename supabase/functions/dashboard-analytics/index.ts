import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const querySchema = z.object({
  organiser_profile_id: z.string().uuid(),
  timeframe: z.enum(['past_week', 'past_month', 'past_3_months', 'past_year', 'all_time']).default('past_month'),
});

function getTimeframeDate(timeframe: string): Date | null {
  const now = new Date();
  switch (timeframe) {
    case 'past_week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'past_month': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'past_3_months': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'past_year': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all_time': return null;
    default: return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    const user = { id: claimsData.claims.sub as string };

    const allowed = await checkRateLimit('dashboard-analytics', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten() });
    }

    const { organiser_profile_id, timeframe } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is owner or accepted member
    const [ownerCheck, memberCheck] = await Promise.all([
      serviceClient.from('organiser_profiles').select('owner_id').eq('id', organiser_profile_id).maybeSingle(),
      serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
    ]);

    const isAuthorized = ownerCheck.data?.owner_id === user.id || !!memberCheck.data;
    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

    // Get all events for this organiser
    const { data: events } = await serviceClient
      .from('events')
      .select('id, event_date, ticket_price_cents, status')
      .eq('organiser_profile_id', organiser_profile_id);

    const eventIds = (events || []).map(e => e.id);

    if (eventIds.length === 0) {
      return successResponse({
        total_revenue_cents: 0,
        total_attendees: 0,
        net_tickets_sold: 0,
        total_ticket_capacity: 0,
        tickets_sold_pct: 0,
        total_views: 0,
        conversion_rate_pct: 0,
        follower_count: 0,
        vip_guestlist_count: 0,
        timeframe,
      }, requestId);
    }

    const sinceDate = getTimeframeDate(timeframe);

    let ordersQuery = serviceClient
      .from('orders')
      .select('amount_cents, quantity, status, confirmed_at')
      .in('event_id', eventIds)
      .eq('status', 'confirmed');
    if (sinceDate) {
      ordersQuery = ordersQuery.gte('confirmed_at', sinceDate.toISOString());
    }

    let rsvpsQuery = serviceClient
      .from('rsvps')
      .select('id, status, created_at')
      .in('event_id', eventIds)
      .eq('status', 'going');
    if (sinceDate) {
      rsvpsQuery = rsvpsQuery.gte('created_at', sinceDate.toISOString());
    }

    const tiersQuery = serviceClient
      .from('ticket_tiers')
      .select('available_quantity')
      .in('event_id', eventIds);

    const followersQuery = serviceClient
      .from('organiser_followers')
      .select('id', { count: 'exact', head: true })
      .eq('organiser_profile_id', organiser_profile_id);

    const [ordersRes, rsvpsRes, tiersRes, followersRes] = await Promise.all([
      ordersQuery,
      rsvpsQuery,
      tiersQuery,
      followersQuery,
    ]);

    const confirmedOrders = ordersRes.data || [];
    const totalRevenueCents = confirmedOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
    const netTicketsSold = confirmedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    const totalAttendees = (rsvpsRes.data || []).length;

    const tiers = tiersRes.data || [];
    const totalCapacity = tiers.reduce((sum, t) => sum + (t.available_quantity || 0), 0);
    const ticketsSoldPct = totalCapacity > 0 ? Math.round((netTicketsSold / totalCapacity) * 100) : 0;

    // Views/Impressions — placeholder until event_views table is created
    const totalViews = 0;
    const conversionRatePct = totalViews > 0 ? Math.round((netTicketsSold / totalViews) * 100) : 0;

    const followerCount = followersRes.count || 0;
    const vipGuestlistCount = totalAttendees;

    return successResponse({
      total_revenue_cents: totalRevenueCents,
      total_attendees: totalAttendees,
      net_tickets_sold: netTicketsSold,
      total_ticket_capacity: totalCapacity,
      tickets_sold_pct: ticketsSoldPct,
      total_views: totalViews,
      conversion_rate_pct: conversionRatePct,
      follower_count: followerCount,
      vip_guestlist_count: vipGuestlistCount,
      timeframe,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'Dashboard analytics error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
