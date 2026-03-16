import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const privacySettingsSchema = z.object({
  go_public: z.boolean().optional(),
  share_saved_events: z.boolean().optional(),
  share_going_events: z.boolean().optional(),
}).strict();

const notificationSettingsSchema = z.object({
  push_notifications: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  event_reminders: z.boolean().optional(),
  friend_activity: z.boolean().optional(),
  new_events: z.boolean().optional(),
  promotions: z.boolean().optional(),
  messages: z.boolean().optional(),
  mentions: z.boolean().optional(),
}).strict();

const requestSchema = z.object({
  table: z.enum(['privacy_settings', 'notification_settings']),
  settings: z.record(z.unknown()),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    // Rate limit
    const allowed = await checkRateLimit('settings-upsert', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();

    // Validate top-level structure
    const reqParsed = requestSchema.safeParse(body);
    if (!reqParsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: reqParsed.error.flatten().fieldErrors });
    }

    const { table, settings } = reqParsed.data;

    // Validate settings against table-specific schema
    const settingsSchema = table === 'privacy_settings' ? privacySettingsSchema : notificationSettingsSchema;
    const settingsParsed = settingsSchema.safeParse(settings);
    if (!settingsParsed.success) {
      return errorResponse(400, 'Invalid settings', { requestId, details: settingsParsed.error.flatten().fieldErrors });
    }

    const filtered = settingsParsed.data;

    if (Object.keys(filtered).length === 0) {
      return errorResponse(400, 'No valid settings provided', { requestId });
    }

    // Check if row exists
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', user.id)
      .single();

    let error;
    if (existing) {
      const result = await supabase.from(table).update(filtered).eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase.from(table).insert({ user_id: user.id, ...filtered });
      error = result.error;
    }

    if (error) {
      return errorResponse(500, error.message, { requestId });
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'Internal error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal error', { requestId });
  }
});
