import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let userId: string | null = null;

    // Auth is optional for support requests (allow anonymous feedback)
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Parse & validate body
    const body = await req.json();
    const { category, subject, message, context_metadata } = body;

    const validCategories = ["general", "bug", "feature_request", "account", "billing", "safety", "other"];
    if (category && !validCategories.includes(category)) {
      return errorResponse(400, "Invalid category", { requestId });
    }
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return errorResponse(400, "subject is required", { requestId });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return errorResponse(400, "message is required", { requestId });
    }

    // Rate limit
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    if (userId) {
      const { data: allowed } = await serviceClient.rpc("check_rate_limit", {
        p_endpoint: "support-request-create",
        p_user_id: userId,
        p_max_requests: 5,
        p_window_seconds: 3600,
      });
      if (allowed === false) {
        return errorResponse(429, "Too many requests. Please try again later.", { requestId });
      }
    }

    // Insert via service role
    const { data: request, error: insertError } = await serviceClient
      .from("support_requests")
      .insert({
        user_id: userId,
        category: category || "general",
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 5000),
        context_metadata: context_metadata && typeof context_metadata === "object"
          ? context_metadata
          : {},
        status: "open",
      })
      .select("id, created_at")
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, request, request_id: requestId }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    edgeLog("error", "support-request-create error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
