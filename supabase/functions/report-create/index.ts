import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Missing authorization", { requestId });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    // Parse & validate body
    const body = await req.json();
    const { target_type, target_id, reason, description } = body;

    const validTypes = ["post", "user", "organiser_profile", "event", "message"];
    if (!target_type || !validTypes.includes(target_type)) {
      return errorResponse(400, "Invalid target_type", { requestId });
    }
    if (!target_id || typeof target_id !== "string") {
      return errorResponse(400, "target_id is required", { requestId });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return errorResponse(400, "reason is required", { requestId });
    }

    // Rate limit: max 10 reports per hour per user
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
      p_endpoint: "report-create",
      p_user_id: user.id,
      p_max_requests: 10,
      p_window_seconds: 3600,
    });
    if (allowed === false) {
      return errorResponse(429, "Too many reports. Please try again later.", { requestId });
    }

    // Check for duplicate report
    const { data: existing } = await serviceClient
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return errorResponse(409, "You have already reported this content", { requestId });
    }

    // Insert report via service role (bypasses RLS)
    const insertData: Record<string, unknown> = {
      reporter_id: user.id,
      target_type,
      target_id,
      reason: reason.trim().slice(0, 200),
      description: description ? String(description).trim().slice(0, 2000) : null,
      status: "open",
    };

    // Backfill legacy columns for compatibility
    if (target_type === "post") insertData.reported_post_id = target_id;
    if (target_type === "user") insertData.reported_user_id = target_id;

    const { data: report, error: insertError } = await serviceClient
      .from("reports")
      .insert(insertData)
      .select("id, created_at")
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, report, request_id: requestId }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    edgeLog("error", "report-create error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
