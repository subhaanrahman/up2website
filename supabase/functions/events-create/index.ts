import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Rate limit
    const allowed = await checkRateLimit('events-create', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const { title, description, location, event_date, end_date, category, max_guests, is_public, organiser_profile_id, publish_at } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!event_date) {
      return new Response(JSON.stringify({ error: 'event_date is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate organiser_profile_id if provided
    let validatedOrgId: string | null = null;
    if (organiser_profile_id) {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { data: isOwner } = await adminClient.rpc('is_organiser_owner', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      });

      const { data: isMember } = await adminClient.rpc('is_organiser_member', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      });

      if (!isOwner && !isMember) {
        return new Response(JSON.stringify({ error: 'You do not have access to this organiser profile' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      validatedOrgId = organiser_profile_id;
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        host_id: user.id,
        title: title.trim().slice(0, 200),
        description: description?.slice(0, 5000) || null,
        location: location?.slice(0, 500) || null,
        event_date,
        end_date: end_date || null,
        category: category || 'party',
        max_guests: max_guests ? Math.min(Math.max(1, max_guests), 100000) : null,
        is_public: is_public !== false,
        organiser_profile_id: validatedOrgId,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-create a post for this event in the feed
    try {
      const postContent = `🎉 ${data.title}${data.description ? ` — ${data.description.slice(0, 200)}` : ''}`;
      await supabase.from('posts').insert({
        author_id: user.id,
        organiser_profile_id: validatedOrgId,
        event_id: data.id,
        content: postContent,
        image_url: data.cover_image || null,
      });
    } catch (postErr) {
      console.error('Failed to create event post (non-fatal):', postErr);
    }

    return new Response(JSON.stringify(data), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
