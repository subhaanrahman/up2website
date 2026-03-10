import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CATEGORIES = ['Venue', 'Event'] as const;

const updateSchema = z.object({
  profile_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(100).optional(),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 lowercase alphanumeric or underscores').optional(),
  bio: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  instagram_handle: z.string().trim().max(30).regex(/^[a-zA-Z0-9._]*$/, 'Invalid Instagram handle').optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  opening_hours: z.record(z.string(), z.string()).optional().nullable(),
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

    const allowed = await checkRateLimit('organiser-profile-update', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { profile_id, ...updates } = parsed.data;

    // Use service role to update
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify ownership
    const { data: existing, error: fetchErr } = await serviceClient
      .from('organiser_profiles')
      .select('id, owner_id')
      .eq('id', profile_id)
      .single();

    if (fetchErr || !existing) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existing.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.bio !== undefined) updateData.bio = updates.bio || null;
    if (updates.city !== undefined) updateData.city = updates.city || null;
    if (updates.instagram_handle !== undefined) updateData.instagram_handle = updates.instagram_handle || null;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.opening_hours !== undefined) updateData.opening_hours = updates.opening_hours;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('organiser_profiles')
      .update(updateData)
      .eq('id', profile_id)
      .select('id, display_name, username, category')
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Username already taken' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, profile: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
