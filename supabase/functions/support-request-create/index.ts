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
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return new Response(JSON.stringify({ error: "subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

    return new Response(JSON.stringify({ success: true, request }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("support-request-create error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
