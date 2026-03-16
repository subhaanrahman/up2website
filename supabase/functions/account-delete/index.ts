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
    if (!authHeader) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    // Verify user identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    // Use service role to delete user data and auth record
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete profile (cascades handled by FK or manual cleanup)
    await adminClient.from("profiles").delete().eq("user_id", user.id);
    await adminClient.from("connections").delete().or(
      `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
    );
    await adminClient.from("posts").delete().eq("author_id", user.id);
    await adminClient.from("saved_events").delete().eq("user_id", user.id);
    await adminClient.from("rsvps").delete().eq("user_id", user.id);
    await adminClient.from("notifications").delete().eq("user_id", user.id);
    await adminClient.from("user_points").delete().eq("user_id", user.id);
    await adminClient.from("point_transactions").delete().eq("user_id", user.id);

    // Delete the auth user
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      edgeLog('error', 'Failed to delete auth user', { requestId, error: String(deleteError) });
      return errorResponse(500, "Failed to delete account", { requestId });
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'account-delete error', { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
