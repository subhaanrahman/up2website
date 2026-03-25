import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { userCanManageEvent } from "../_shared/event-host-auth.ts";

const bodySchema = z.object({
  event_id: z.string().uuid(),
  user_ids: z.array(z.string().uuid()).min(1).max(25),
});

type RsvpHostInviteRow = {
  user_id: string;
  code: string;
  message?: string;
  status?: string;
  position?: number;
  detail?: unknown;
};

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

    const allowed = await checkRateLimit("rsvp-bulk-invite", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { event_id, user_ids } = parsed.data;
    const deduped = [...new Set(user_ids)];

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const canManage = await userCanManageEvent(serviceClient, event_id, user.id);
    if (!canManage) {
      return errorResponse(403, "Not authorized", { requestId });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("rsvp_host_invite", {
      p_event_id: event_id,
      p_invitee_user_ids: deduped,
    });

    if (rpcError) {
      const msg = rpcError.message || "RPC failed";
      const code = msg.includes("Not authorized")
        ? 403
        : msg.includes("not found")
        ? 404
        : 400;
      return errorResponse(code, msg, { requestId });
    }

    const payload = rpcData as { results?: RsvpHostInviteRow[] } | null;
    const results = Array.isArray(payload?.results) ? payload!.results : [];

    const { data: eventRow } = await serviceClient
      .from("events")
      .select("title")
      .eq("id", event_id)
      .maybeSingle();

    const eventTitle = (eventRow?.title as string) || "an event";

    const { data: inviterProfile } = await serviceClient
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const inviterName =
      (inviterProfile?.display_name as string) ||
      (inviterProfile?.username as string) ||
      "Someone";

    for (const row of results) {
      if (row.code === "error" || row.code === "already_rsvp") continue;
      const recipient = row.user_id;
      if (recipient === user.id) continue;

      let title = "Event invitation";
      let message = `${inviterName} added you to the guest list for ${eventTitle}.`;
      if (row.code === "waitlisted") {
        title = "Waitlist";
        message = `${inviterName} added you to the waitlist for ${eventTitle}.`;
      }

      const { error: insErr } = await serviceClient.from("notifications").insert({
        user_id: recipient,
        type: "shared_event",
        title,
        message,
        avatar_url: (inviterProfile?.avatar_url as string) || null,
        link: `/events/${event_id}`,
      });

      if (insErr) {
        edgeLog("warn", "rsvp-bulk-invite notification insert failed", {
          requestId,
          recipient,
          error: String(insErr),
        });
      }
    }

    return successResponse({ results, event_id }, requestId);
  } catch (err) {
    edgeLog("error", "rsvp-bulk-invite error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
