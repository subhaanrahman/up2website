import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const updateSchema = z.object({
  action: z.enum(['update', 'delete']),
  event_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  event_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  max_guests: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().optional(),
  cover_image: z.string().url().nullable().optional(),
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

    const allowed = await checkRateLimit('events-update', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, event_id, ...fields } = parsed.data;

    // Use service role to bypass RLS for ownership check and mutations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify ownership (direct host or organiser profile owner/member)
    const { data: event, error: fetchErr } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id')
      .eq('id', event_id)
      .maybeSingle();

    if (fetchErr || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isAuthorized = event.host_id === user.id;

    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        serviceClient
          .from('organiser_profiles')
          .select('owner_id')
          .eq('id', event.organiser_profile_id)
          .maybeSingle(),
        serviceClient
          .from('organiser_members')
          .select('id')
          .eq('organiser_profile_id', event.organiser_profile_id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle(),
      ]);
      if (orgResult.data?.owner_id === user.id || memberResult.data) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { error: delErr } = await serviceClient.from('events').delete().eq('id', event_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, deleted: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.location !== undefined) updateData.location = fields.location;
    if (fields.event_date !== undefined) updateData.event_date = fields.event_date;
    if (fields.end_date !== undefined) updateData.end_date = fields.end_date;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.max_guests !== undefined) updateData.max_guests = fields.max_guests;
    if (fields.is_public !== undefined) updateData.is_public = fields.is_public;
    if (fields.cover_image !== undefined) updateData.cover_image = fields.cover_image;

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: updated, error: updErr } = await serviceClient
      .from('events')
      .update(updateData)
      .eq('id', event_id)
      .select()
      .single();

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(updated), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
