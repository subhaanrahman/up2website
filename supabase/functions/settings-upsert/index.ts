import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { table, settings } = await req.json();

    // Validate table name
    const allowedTables = ['privacy_settings', 'notification_settings'];
    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate settings keys based on table
    const allowedKeys: Record<string, string[]> = {
      privacy_settings: ['go_public', 'share_saved_events', 'share_going_events'],
      notification_settings: [
        'push_notifications', 'email_notifications', 'event_reminders',
        'friend_activity', 'new_events', 'promotions', 'messages', 'mentions',
      ],
    };

    const filtered: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (allowedKeys[table].includes(key) && typeof value === 'boolean') {
        filtered[key] = value;
      }
    }

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
