import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  qr_code: z.string().min(1).max(100),
  event_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Not authenticated", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Invalid token", { requestId });
    }

    const allowed = await checkRateLimit("checkin-qr", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { qr_code, event_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ticket, error: ticketErr } = await serviceClient
      .from("tickets")
      .select("id, user_id, event_id, status")
      .eq("qr_code", qr_code)
      .eq("event_id", event_id)
      .eq("status", "valid")
      .maybeSingle();

    if (ticketErr || !ticket) {
      return errorResponse(404, "Invalid or expired ticket", { requestId });
    }

    const { data: event } = await serviceClient
      .from("events")
      .select("id, host_id, organiser_profile_id")
      .eq("id", event_id)
      .single();

    if (!event) {
      return errorResponse(404, "Event not found", { requestId });
    }

    let isAuthorized = event.host_id === user.id;
    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        serviceClient.from("organiser_profiles").select("owner_id").eq("id", event.organiser_profile_id).maybeSingle(),
        serviceClient
          .from("organiser_members")
          .select("id")
          .eq("organiser_profile_id", event.organiser_profile_id)
          .eq("user_id", user.id)
          .eq("status", "accepted")
          .maybeSingle(),
      ]);
      if (orgResult.data?.owner_id === user.id || memberResult.data) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(403, "Not authorized to check in for this event", { requestId });
    }

    const { data: existingCheckIn } = await serviceClient
      .from("check_ins")
      .select("id")
      .eq("event_id", event_id)
      .eq("user_id", ticket.user_id)
      .maybeSingle();

    if (existingCheckIn) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", ticket.user_id)
        .maybeSingle();
      const name = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Guest";
      return errorResponse(409, "Already checked in", { requestId, details: { display_name: name } });
    }

    const now = new Date().toISOString();

    const { data: checkIn, error: insertErr } = await serviceClient
      .from("check_ins")
      .insert({
        event_id,
        user_id: ticket.user_id,
        checked_in_by: user.id,
        method: "qr",
        checked_in_at: now,
      })
      .select()
      .single();

    if (insertErr) {
      edgeLog("error", "checkin-qr insert failed", { requestId, error: String(insertErr) });
      return errorResponse(500, "Failed to check in", { requestId });
    }

    await serviceClient
      .from("tickets")
      .update({ checked_in_at: now })
      .eq("id", ticket.id);

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("display_name, first_name, last_name")
      .eq("user_id", ticket.user_id)
      .maybeSingle();

    const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Guest";

    edgeLog("info", "QR check-in success", { requestId, event_id, user_id: ticket.user_id });
    return successResponse({ success: true, check_in: checkIn, display_name: displayName }, requestId);
  } catch (err) {
    edgeLog("error", "checkin-qr error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
