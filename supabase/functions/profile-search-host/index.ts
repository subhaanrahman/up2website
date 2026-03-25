import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { userCanManageEvent } from "../_shared/event-host-auth.ts";

const bodySchema = z.object({
  event_id: z.string().uuid(),
  q: z.string().trim().min(2).max(40),
  limit: z.number().int().min(1).max(20).optional().default(20),
});

function escapeLikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

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

    const allowed = await checkRateLimit("profile-search-host", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { event_id, q, limit } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const canManage = await userCanManageEvent(serviceClient, event_id, user.id);
    if (!canManage) {
      return errorResponse(403, "Not authorized", { requestId });
    }

    const pattern = `${escapeLikePattern(q)}%`;

    const { data: rows, error: qErr } = await serviceClient
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .not("username", "is", null)
      .ilike("username", pattern)
      .order("username", { ascending: true })
      .limit(limit);

    if (qErr) {
      edgeLog("error", "profile-search-host query", { requestId, error: String(qErr) });
      return errorResponse(500, "Search failed", { requestId });
    }

    const profiles = (rows || []).map((r: Record<string, unknown>) => ({
      user_id: r.user_id as string,
      username: r.username as string,
      display_name: (r.display_name as string) || null,
      avatar_url: (r.avatar_url as string) || null,
    }));

    return successResponse({ profiles }, requestId);
  } catch (err) {
    edgeLog("error", "profile-search-host error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
