import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const sendSchema = z.object({
  type: z.enum([
    'shared_event',
    'shared_post',
    'shared_account',
    'post_reaction',
    'post_repost',
    'post_from_following',
    'friend_request',
    'gamification_levelup',
    'group_message',
  ]),
  recipient_user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  avatar_url: z.string().url().nullable().optional(),
  event_image: z.string().url().nullable().optional(),
  link: z.string().nullable().optional(),
  organiser_profile_id: z.string().uuid().nullable().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
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
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowed = await checkRateLimit('notifications-send', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, recipient_user_id, title, message, avatar_url, event_image, link, organiser_profile_id } = parsed.data;

    // Don't let users notify themselves (unless it's a notification scoped to a different profile)
    if (recipient_user_id === user.id && !organiser_profile_id) {
      return new Response(JSON.stringify({ error: 'Cannot notify yourself' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check recipient notification settings
    const { data: settings } = await serviceClient
      .from('notification_settings')
      .select('friend_activity, messages, new_events')
      .eq('user_id', recipient_user_id)
      .maybeSingle();

    if (settings) {
      const blocked =
        (type === 'friend_request' && settings.friend_activity === false) ||
        (type === 'shared_event' && settings.friend_activity === false) ||
        (type === 'shared_post' && settings.friend_activity === false) ||
        (type === 'shared_account' && settings.friend_activity === false) ||
        (type === 'post_reaction' && settings.friend_activity === false) ||
        (type === 'post_repost' && settings.friend_activity === false) ||
        (type === 'post_from_following' && settings.new_events === false) ||
        (type === 'group_message' && settings.messages === false);

      if (blocked) {
        return new Response(JSON.stringify({ success: true, sent: false, reason: 'User has disabled this notification type' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Dedup: check if same notification sent in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await serviceClient
      .from('notifications')
      .select('id')
      .eq('user_id', recipient_user_id)
      .eq('type', type)
      .eq('link', link || '')
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: true, sent: false, reason: 'Duplicate notification suppressed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert notification
    const { error: insertError } = await serviceClient
      .from('notifications')
      .insert({
        user_id: recipient_user_id,
        type,
        title,
        message,
        avatar_url: avatar_url || null,
        event_image: event_image || null,
        link: link || null,
        organiser_profile_id: organiser_profile_id || null,
      });

    if (insertError) {
      console.error('Failed to insert notification:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, sent: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Notifications send error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
