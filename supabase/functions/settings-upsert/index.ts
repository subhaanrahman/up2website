import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit('settings-upsert', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();

    // Validate top-level structure
    const reqParsed = requestSchema.safeParse(body);
    if (!reqParsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: reqParsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { table, settings } = reqParsed.data;

    // Validate settings against table-specific schema
    const settingsSchema = table === 'privacy_settings' ? privacySettingsSchema : notificationSettingsSchema;
    const settingsParsed = settingsSchema.safeParse(settings);
    if (!settingsParsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid settings', details: settingsParsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filtered = settingsParsed.data;

    if (Object.keys(filtered).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid settings provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
