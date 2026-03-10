import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse & validate body
    const body = await req.json();
    const { target_type, target_id, reason, description } = body;

    const validTypes = ["post", "user", "organiser_profile", "event", "message"];
    if (!target_type || !validTypes.includes(target_type)) {
      return new Response(JSON.stringify({ error: "Invalid target_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!target_id || typeof target_id !== "string") {
      return new Response(JSON.stringify({ error: "target_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return new Response(JSON.stringify({ error: "reason is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Too many reports. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "You have already reported this content" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ success: true, report }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("report-create error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
